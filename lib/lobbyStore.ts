// lib/lobbyStore.ts - GiDiSpace State Management
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';
import DynamicChatService from '@/app/components/DynamicChatService';

// Types
export interface Profile {
    id: string;
    username: string;
    selected_avatar_model: string;
    ai_personality_prompt?: string;
    bio?: string;
    interests?: string[];
    voice_id?: string;
    voice_preview_url?: string;
    voice_ready?: boolean;
    created_at?: string;
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

export interface GiDiSpaceStore {
    // User state
    userId: string | null;
    profile: Profile | null;
    isLoading: boolean;

    // Other GiDis in the space
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
        voice_id?: string,
        voice_preview_url?: string,
        voice_ready?: boolean
    ) => Promise<boolean>;
    loadProfile: () => Promise<boolean>;
    updateProfile: (updates: Partial<Profile>) => Promise<boolean>;

    // Avatar state
    updateAvatarState: (updates: Partial<AvatarState>) => Promise<void>;
    loadOtherGidis: () => Promise<void>;
    loadProfileInfo: (profileId: string) => Promise<Profile | null>;

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
            otherAvatars: new Map(),
            profilesCache: new Map(),
            activeChatService: null,
            activeChatTarget: null,

            // Initialize user
            initializeUser: () => {
                const userId = getOrCreateUserId();
                set({ userId });
            },

            // Create a new profile
            createProfile: async (username, avatarModel, aiPersonalityPrompt, bio, interests, voice_id, voice_preview_url, voice_ready) => {
                const { userId } = get();
                if (!userId) {
                    get().initializeUser();
                }

                const currentUserId = get().userId;
                if (!currentUserId) return false;

                set({ isLoading: true });

                try {
                    // Check if profile already exists
                    const { data: existingProfile, error: existingError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', currentUserId)
                        .maybeSingle();
                    if (existingError && existingError.code !== 'PGRST116') {
                        console.error('Error checking existing profile:', existingError);
                    }

                    const profileData = {
                        id: currentUserId,
                        username,
                        selected_avatar_model: avatarModel,
                        ai_personality_prompt: aiPersonalityPrompt || '',
                        bio: bio || '',
                        interests: interests || [],
                        voice_id: voice_id || '',
                        voice_preview_url: voice_preview_url || '',
                        voice_ready: Boolean(voice_ready),
                    };

                    let result;
                    if (existingProfile) {
                        // Update existing profile
                        result = await supabase
                            .from('profiles')
                            .update(profileData)
                            .eq('id', currentUserId)
                            .select()
                            .single();
                    } else {
                        // Insert new profile
                        result = await supabase
                            .from('profiles')
                            .insert(profileData)
                            .select()
                            .single();
                    }

                    if (result.error) {
                        console.error('Error creating profile:', result.error);
                        set({ isLoading: false });
                        return false;
                    }

                    set({
                        profile: result.data as Profile,
                        isLoading: false
                    });
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
                        .maybeSingle();

                    if (error && error.code !== 'PGRST116') {
                        console.error('Error loading profile:', error);
                    }

                    if (!data) {
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
                        });
                } catch (error) {
                    console.error('Error updating avatar state:', error);
                }
            },

            // Load other GiDis in the space
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
                        });
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
