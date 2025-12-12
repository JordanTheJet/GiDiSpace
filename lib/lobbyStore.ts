// lib/lobbyStore.ts - GiDiSpace State Management
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';
import DynamicChatService from '@/app/components/DynamicChatService';

// Backend API URL
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Types
export interface Profile {
    id: string;
    username: string;
    selected_avatar_model: string;
    ai_personality_prompt?: string;
    bio?: string;
    interests?: string[];
    created_at?: string;
    // From Python backend embedding
    coords?: [number, number, number];
    room?: string;
}

export interface AvatarState {
    id: string;
    profile_id: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    animation: string;
    is_online: boolean;
    last_active: string;
}

export interface GiDiFromBackend {
    id: string;
    name: string;
    coords: [number, number, number];
    room: string;
    avatar_model: string;
    bio?: string;
    interests: string[];
    is_online: boolean;
}

export interface GiDiSpaceStore {
    // User state
    userId: string | null;
    profile: Profile | null;
    isLoading: boolean;

    // Other GiDis in the space (from Python backend)
    allGidis: GiDiFromBackend[];
    otherAvatars: Map<string, AvatarState>;
    profilesCache: Map<string, Profile>;

    // Chat state
    activeChatService: DynamicChatService | null;
    activeChatTarget: {
        type: 'gidi';
        name: string;
        id: string;
    } | null;

    // Actions
    initializeUser: () => void;
    createProfile: (
        username: string,
        avatarModel: string,
        aiPersonalityPrompt?: string,
        bio?: string,
        interests?: string[],
        cvText?: string
    ) => Promise<boolean>;
    loadProfile: () => Promise<boolean>;
    updateProfile: (updates: Partial<Profile>) => Promise<boolean>;

    // Avatar state
    updateAvatarState: (updates: Partial<AvatarState>) => Promise<void>;
    loadOtherGidis: () => Promise<void>;
    loadAllGidisFromBackend: () => Promise<void>;
    loadProfileInfo: (profileId: string) => Promise<Profile | null>;
    getNeighbors: (k?: number) => Promise<GiDiFromBackend[]>;

    // Chat
    startChatWithGidi: (profile: Profile) => void;
    endChat: () => void;

    // Online status
    markOnline: () => Promise<void>;
    markOffline: () => Promise<void>;
}

// Generate unique user ID
function generateUserId(): string {
    return `gidi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get or create user ID from localStorage
function getOrCreateUserId(): string {
    if (typeof window === 'undefined') return generateUserId();

    const existingId = localStorage.getItem('gidispace_user_id');
    if (existingId) return existingId;

    const newId = generateUserId();
    localStorage.setItem('gidispace_user_id', newId);
    return newId;
}

export const useLobbyStore = create<GiDiSpaceStore>()(
    persist(
        (set, get) => ({
            // Initial state
            userId: null,
            profile: null,
            isLoading: false,
            allGidis: [],
            otherAvatars: new Map(),
            profilesCache: new Map(),
            activeChatService: null,
            activeChatTarget: null,

            // Initialize user
            initializeUser: () => {
                const userId = getOrCreateUserId();
                set({ userId });
            },

            // Create a new profile - calls Python backend for embedding + Supabase for persistence
            createProfile: async (username, avatarModel, aiPersonalityPrompt, bio, interests, cvText) => {
                const { userId } = get();
                if (!userId) {
                    get().initializeUser();
                }

                const currentUserId = get().userId;
                if (!currentUserId) return false;

                set({ isLoading: true });

                try {
                    // Call Python backend to create profile with embedding
                    const backendResponse = await fetch(`${BACKEND_URL}/profiles`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: currentUserId,
                            name: username,
                            cv_text: cvText || bio || '',
                            bio: bio || '',
                            interests: interests || [],
                            avatar_model: avatarModel,
                            ai_personality_prompt: aiPersonalityPrompt || '',
                        }),
                    });

                    if (!backendResponse.ok) {
                        console.error('Backend error:', await backendResponse.text());
                        // Fallback to Supabase-only if backend is unavailable
                        console.log('Falling back to Supabase-only profile creation');
                    } else {
                        const backendData = await backendResponse.json();
                        console.log('Profile created with embedding:', backendData);
                    }

                    // Also save to Supabase directly (in case backend didn't have Supabase configured)
                    const profileData = {
                        id: currentUserId,
                        username,
                        selected_avatar_model: avatarModel,
                        ai_personality_prompt: aiPersonalityPrompt || '',
                        bio: bio || '',
                        interests: interests || [],
                    };

                    const { data: existingProfile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', currentUserId)
                        .single();

                    let result;
                    if (existingProfile) {
                        result = await supabase
                            .from('profiles')
                            .update(profileData)
                            .eq('id', currentUserId)
                            .select()
                            .single();
                    } else {
                        result = await supabase
                            .from('profiles')
                            .insert(profileData)
                            .select()
                            .single();
                    }

                    if (result.error) {
                        console.error('Error saving to Supabase:', result.error);
                        set({ isLoading: false });
                        return false;
                    }

                    set({
                        profile: result.data as Profile,
                        isLoading: false
                    });

                    // Update online status
                    get().markOnline();

                    return true;
                } catch (error) {
                    console.error('Error in createProfile:', error);
                    set({ isLoading: false });
                    return false;
                }
            },

            // Load existing profile
            loadProfile: async () => {
                let { userId } = get();
                if (!userId) {
                    get().initializeUser();
                    userId = get().userId;
                }
                if (!userId) return false;

                set({ isLoading: true });

                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', userId)
                        .single();

                    if (error || !data) {
                        set({ profile: null, isLoading: false });
                        return false;
                    }

                    set({
                        profile: data as Profile,
                        isLoading: false
                    });
                    return true;
                } catch (error) {
                    console.error('Error loading profile:', error);
                    set({ isLoading: false });
                    return false;
                }
            },

            // Update profile
            updateProfile: async (updates) => {
                const { userId, profile } = get();
                if (!userId || !profile) return false;

                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .update(updates)
                        .eq('id', userId)
                        .select()
                        .single();

                    if (error) {
                        console.error('Error updating profile:', error);
                        return false;
                    }

                    set({ profile: { ...profile, ...data } as Profile });
                    return true;
                } catch (error) {
                    console.error('Error in updateProfile:', error);
                    return false;
                }
            },

            // Update avatar state (position, animation, etc.)
            updateAvatarState: async (updates) => {
                const { userId } = get();
                if (!userId) return;

                try {
                    await supabase
                        .from('avatar_states')
                        .upsert({
                            profile_id: userId,
                            ...updates,
                            last_active: new Date().toISOString()
                        }, { onConflict: 'profile_id' });
                } catch (error) {
                    console.error('Error updating avatar state:', error);
                }
            },

            // Load other GiDis in the space (from Supabase)
            loadOtherGidis: async () => {
                const { userId } = get();

                try {
                    const { data, error } = await supabase
                        .from('avatar_states')
                        .select('*, profiles(*)')
                        .neq('profile_id', userId || '');

                    if (error) {
                        console.error('Error loading other GiDis:', error);
                        return;
                    }

                    const avatarsMap = new Map<string, AvatarState>();
                    const profilesMap = new Map<string, Profile>();

                    data?.forEach((item: any) => {
                        if (item.profiles) {
                            profilesMap.set(item.profile_id, item.profiles);
                        }
                        avatarsMap.set(item.profile_id, {
                            id: item.id,
                            profile_id: item.profile_id,
                            position: item.position || { x: 0, y: 0, z: 0 },
                            rotation: item.rotation || { x: 0, y: 0, z: 0 },
                            animation: item.animation || 'idle',
                            is_online: item.is_online || false,
                            last_active: item.last_active
                        });
                    });

                    set({
                        otherAvatars: avatarsMap,
                        profilesCache: profilesMap
                    });
                } catch (error) {
                    console.error('Error in loadOtherGidis:', error);
                }
            },

            // Load all GiDis from Python backend (with 3D coordinates)
            loadAllGidisFromBackend: async () => {
                try {
                    const response = await fetch(`${BACKEND_URL}/profiles`);
                    if (!response.ok) {
                        console.error('Failed to load GiDis from backend');
                        return;
                    }
                    const data = await response.json();
                    set({ allGidis: data.profiles || [] });
                } catch (error) {
                    console.error('Error loading GiDis from backend:', error);
                }
            },

            // Get neighbors for current user from Python backend
            getNeighbors: async (k = 5) => {
                const { userId } = get();
                if (!userId) return [];

                try {
                    const response = await fetch(`${BACKEND_URL}/neighbors/id/${userId}?k=${k}`);
                    if (!response.ok) {
                        console.error('Failed to get neighbors');
                        return [];
                    }
                    const data = await response.json();
                    return data.neighbors || [];
                } catch (error) {
                    console.error('Error getting neighbors:', error);
                    return [];
                }
            },

            // Load profile info for a specific user
            loadProfileInfo: async (profileId) => {
                const { profilesCache } = get();

                // Check cache first
                if (profilesCache.has(profileId)) {
                    return profilesCache.get(profileId) || null;
                }

                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', profileId)
                        .single();

                    if (error || !data) return null;

                    const profile = data as Profile;
                    const newCache = new Map(profilesCache);
                    newCache.set(profileId, profile);
                    set({ profilesCache: newCache });

                    return profile;
                } catch (error) {
                    console.error('Error loading profile info:', error);
                    return null;
                }
            },

            // Start chat with another GiDi
            startChatWithGidi: (targetProfile) => {
                const chatService = new DynamicChatService({
                    type: 'digital-twin',
                    profile: targetProfile
                });

                set({
                    activeChatService: chatService,
                    activeChatTarget: {
                        type: 'gidi',
                        name: targetProfile.username,
                        id: targetProfile.id
                    }
                });
            },

            // End current chat
            endChat: () => {
                set({
                    activeChatService: null,
                    activeChatTarget: null
                });
            },

            // Mark user as online
            markOnline: async () => {
                const { userId } = get();
                if (!userId) return;

                try {
                    await supabase
                        .from('avatar_states')
                        .upsert({
                            profile_id: userId,
                            is_online: true,
                            last_active: new Date().toISOString()
                        }, { onConflict: 'profile_id' });
                } catch (error) {
                    console.error('Error marking online:', error);
                }
            },

            // Mark user as offline
            markOffline: async () => {
                const { userId } = get();
                if (!userId) return;

                try {
                    await supabase
                        .from('avatar_states')
                        .update({
                            is_online: false,
                            last_active: new Date().toISOString()
                        })
                        .eq('profile_id', userId);
                } catch (error) {
                    console.error('Error marking offline:', error);
                }
            },
        }),
        {
            name: 'gidispace-store',
            partialize: (state) => ({
                userId: state.userId,
            }),
        }
    )
);
