// lib/types.ts

// Re-export types from lobbyStore
export type { Profile, AvatarState } from './lobbyStore';

// Custom Lobby type
export interface CustomLobby {
    id: string;
    lobby_code: string;
    name: string;
    description?: string;
    host_profile_id?: string;
    additional_host_knowledge?: string;
    use_my_profile?: boolean;
    custom_host_name?: string;
    is_public?: boolean;
    created_at?: string;
}

// Chat system types
export interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

// Avatar system types
export interface Avatar {
    name?: string;
    model: string;        // VRM model URL
    personality: string;  // AI personality prompt
    history: Message[];   // Conversation history
    // Host-specific properties (optional)
    eventSchedule?: string;
    contact?: string;
    stories?: string[];
}

// User types
export interface User {
    userId: string;
    username?: string;
    avatar: Avatar;
    profileId?: string;  // Link to Supabase profile
}

// Digital Twin types (simplified - mostly using AvatarState from Supabase now)
export interface DigitalTwin {
    profileId: string;
    username: string;
    avatarModel: string;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    animation: string;
    isOnline: boolean;
    aiBehavior: 'idle' | 'wander' | 'patrol' | 'talking';
    lastActivity: Date;
    equippedWeapon?: {
        id: string;
        name: string;
        model: string;
        type: 'sword' | 'pistol';
    };
}

// Lobby types
export interface Lobby {
    lobbyId: string;
    name: string;
    description: string;
    theme: string;
    hostAvatar: Avatar;      // NPC with host privileges
    maxPlayers: number;
    currentPlayers: User[];
    digitalTwins?: DigitalTwin[];  // Offline users' avatars
    backgroundScene?: string;
    backgroundColor?: string;
    environmentImage?: string;
    isPublic?: boolean;      // Whether the lobby is public or private
    createdBy?: string;      // Profile ID of the creator
    additionalKnowledge?: string;  // Additional host knowledge from database
}

// Base lobby state (what components need to know about)
export interface LobbyState {
    currentUser: User | null;
    currentLobby: Lobby | null;
    availableLobbies: Lobby[];
    isInLobby: boolean;
    showLobbySelector: boolean;
}

// Chat target type (for active chats)
export interface ChatTarget {
    type: 'npc' | 'digital-twin';
    name: string;
    id?: string;  // profile ID for digital twins
}

// Chat start parameters
export interface ChatStartParams {
    type: 'npc' | 'digital-twin';
    lobby?: Lobby;
    profile?: any;  // Using 'any' here since Profile is from supabase.ts
    avatarState?: any;  // Using 'any' here since AvatarState is from supabase.ts
}

// Chat response type
export interface ChatResponse {
    message: string;
    emotion?: string;
    animation?: string;
    isNPC?: boolean;
    isDigitalTwin?: boolean;
    originalUser?: string;  // For digital twins
}

// AI Behavior configuration
export interface AIBehaviorConfig {
    type: 'idle' | 'wander' | 'patrol' | 'talking';
    updateInterval: number;  // milliseconds
    movementRadius?: number;  // units in 3D space
    patrolPath?: Array<{ x: number; y: number; z: number }>;
    idleAnimations?: string[];
    wanderSpeed?: number;
}

// Nearest avatar info (for proximity detection)
export interface NearestAvatar {
    avatar: any;  // The Three.js object
    type: 'npc' | 'digital-twin';
    data: any;    // Either lobby host avatar or profile+avatarState
    distance: number;
}