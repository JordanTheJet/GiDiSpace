// app/components/SpaceLounge.tsx - GiDiSpace 3D Environment
// An open, inviting space lounge where GiDis gather

"use client";

import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils, VRM } from '@pixiv/three-vrm';
import { loadMixamoAnimation } from './loadMixamoAnimation';
import { useLobbyStore } from '@/lib/lobbyStore';
import RoomChat from './RoomChat';
import { MessageCircle, Users, Settings } from 'lucide-react';

// Animation URLs
const ANIMATION_IDLE = '/animations/Idle.fbx';
const ANIMATION_WALKING = '/animations/Walking.fbx';
const ANIMATION_JUMPING = '/animations/Jumping.fbx';

// Performance settings
const isMobileDevice = () => {
    if (typeof window === 'undefined') return false;
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

interface SpaceLoungeProps {
    onOpenChat?: (gidiId: string, gidiName: string) => void;
}

// NPC Configuration
const NPC_CONFIG = {
    name: 'Lily',
    avatar: '/avatars/Giulia.vrm',
    position: { x: 5, y: 0, z: -5 },
    personality: 'A friendly AI assistant in GiDiSpace. Lily is knowledgeable, warm, and always happy to help newcomers navigate the space.',
    greeting: "Hi there! I'm Lily, your guide to GiDiSpace. Feel free to ask me anything!",
};

const SpaceLounge = ({ onOpenChat }: SpaceLoungeProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const avatarRef = useRef<VRM | null>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const clockRef = useRef(new THREE.Clock());
    const animationActionsRef = useRef<Map<string, THREE.AnimationAction>>(new Map());
    const keysPressed = useRef<Set<string>>(new Set());
    const currentAnimationRef = useRef<string>('idle');

    // NPC refs
    const npcRef = useRef<VRM | null>(null);
    const npcMixerRef = useRef<THREE.AnimationMixer | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [nearbyGidis, setNearbyGidis] = useState<string[]>([]);

    // NPC state
    const [isNearNpc, setIsNearNpc] = useState(false);
    const [showNpcChat, setShowNpcChat] = useState(false);
    const [npcChatMessages, setNpcChatMessages] = useState<{ role: 'user' | 'npc'; content: string }[]>([
        { role: 'npc', content: NPC_CONFIG.greeting }
    ]);
    const [npcChatInput, setNpcChatInput] = useState('');
    const [isNpcTyping, setIsNpcTyping] = useState(false);
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const [isSpeaking, setIsSpeaking] = useState(false);

    // Refs for keyboard handler access to state
    const isNearNpcRef = useRef(false);
    const showNpcChatRef = useRef(false);

    // Keep refs in sync with state
    useEffect(() => {
        isNearNpcRef.current = isNearNpc;
    }, [isNearNpc]);

    useEffect(() => {
        showNpcChatRef.current = showNpcChat;
    }, [showNpcChat]);

    // Movement speed
    const MOVE_SPEED = 5;
    const NPC_INTERACTION_DISTANCE = 3;

    // Switch animation with crossfade
    const switchAnimation = (newAnim: string) => {
        if (currentAnimationRef.current === newAnim) return;

        const actions = animationActionsRef.current;
        const currentAction = actions.get(currentAnimationRef.current);
        const newAction = actions.get(newAnim);

        if (newAction) {
            if (currentAction) {
                currentAction.fadeOut(0.2);
            }
            newAction.reset().fadeIn(0.2).play();
            currentAnimationRef.current = newAnim;
        }
    };

    // Play voice using ElevenLabs TTS
    const playVoice = async (text: string) => {
        if (!voiceEnabled || !text) return;

        // Stop any currently playing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        setIsSpeaking(true);

        try {
            const response = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) {
                console.error('TTS API error:', response.status);
                setIsSpeaking(false);
                return;
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            audioRef.current = audio;

            audio.onended = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
                audioRef.current = null;
            };

            audio.onerror = () => {
                console.error('Audio playback error');
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
                audioRef.current = null;
            };

            await audio.play();
        } catch (error) {
            console.error('Voice playback error:', error);
            setIsSpeaking(false);
        }
    };

    // Stop voice playback
    const stopVoice = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
            setIsSpeaking(false);
        }
    };

    const { profile } = useLobbyStore();

    // Create starfield background
    const createStarfield = (scene: THREE.Scene) => {
        // Create stars
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 5000;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount; i++) {
            const i3 = i * 3;
            // Distribute stars in a sphere around the scene
            const radius = 500 + Math.random() * 500;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);

            // Varying star colors (white, blue-white, yellow-white)
            const colorChoice = Math.random();
            if (colorChoice < 0.6) {
                colors[i3] = 1; colors[i3 + 1] = 1; colors[i3 + 2] = 1; // White
            } else if (colorChoice < 0.8) {
                colors[i3] = 0.8; colors[i3 + 1] = 0.9; colors[i3 + 2] = 1; // Blue-white
            } else {
                colors[i3] = 1; colors[i3 + 1] = 0.95; colors[i3 + 2] = 0.8; // Yellow-white
            }
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const starMaterial = new THREE.PointsMaterial({
            size: 2,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });

        const stars = new THREE.Points(starGeometry, starMaterial);
        scene.add(stars);

        return stars;
    };

    // Create the lounge floor (floating platform in space)
    const createLoungeFloor = (scene: THREE.Scene) => {
        // Main platform - circular with glowing edges
        const platformGeometry = new THREE.CylinderGeometry(30, 32, 0.5, 64);
        const platformMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0x0f0f1a,
            emissiveIntensity: 0.2
        });
        const platform = new THREE.Mesh(platformGeometry, platformMaterial);
        platform.position.y = -0.25;
        platform.receiveShadow = true;
        scene.add(platform);

        // Glowing ring around the platform
        const ringGeometry = new THREE.TorusGeometry(31, 0.3, 16, 100);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x6366f1,
            transparent: true,
            opacity: 0.6
        });
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0;
        scene.add(ring);

        // Inner decorative circles
        for (let i = 0; i < 3; i++) {
            const innerRingGeometry = new THREE.TorusGeometry(10 + i * 7, 0.1, 16, 64);
            const innerRingMaterial = new THREE.MeshBasicMaterial({
                color: 0x8b5cf6,
                transparent: true,
                opacity: 0.3 - i * 0.08
            });
            const innerRing = new THREE.Mesh(innerRingGeometry, innerRingMaterial);
            innerRing.rotation.x = Math.PI / 2;
            innerRing.position.y = 0.01;
            scene.add(innerRing);
        }

        // Grid pattern on floor (subtle)
        const gridHelper = new THREE.PolarGridHelper(30, 8, 8, 64, 0x6366f1, 0x6366f1);
        const gridMaterial = gridHelper.material as THREE.Material;
        gridMaterial.opacity = 0.1;
        gridMaterial.transparent = true;
        gridHelper.position.y = 0.01;
        scene.add(gridHelper);
    };

    // Create a name label sprite
    const createNameLabel = (name: string): THREE.Sprite => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 64;

        // Background (semi-transparent)
        context.fillStyle = 'rgba(0, 0, 0, 0.6)';
        context.roundRect(0, 0, canvas.width, canvas.height, 10);
        context.fill();

        // Border
        context.strokeStyle = 'rgba(139, 92, 246, 0.8)'; // Purple
        context.lineWidth = 2;
        context.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 8);
        context.stroke();

        // Text
        context.fillStyle = '#ffffff';
        context.font = 'bold 28px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(name, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
        });

        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(1.5, 0.4, 1); // Adjust size

        return sprite;
    };

    // Load NPC character
    const loadNPC = async (scene: THREE.Scene, loader: GLTFLoader) => {
        console.log('Loading NPC:', NPC_CONFIG.name);

        loader.load(
            NPC_CONFIG.avatar,
            async (gltf) => {
                const vrm = gltf.userData.vrm;
                if (!vrm) {
                    console.error('No VRM data for NPC');
                    return;
                }

                console.log('NPC loaded:', NPC_CONFIG.name);
                scene.add(vrm.scene);
                npcRef.current = vrm;

                vrm.scene.traverse((obj: THREE.Object3D) => {
                    obj.frustumCulled = false;
                });

                VRMUtils.rotateVRM0(vrm);
                vrm.scene.position.set(NPC_CONFIG.position.x, NPC_CONFIG.position.y, NPC_CONFIG.position.z);

                // Add name label
                const nameLabel = createNameLabel(NPC_CONFIG.name);
                nameLabel.position.set(0, 1.8, 0);
                vrm.scene.add(nameLabel);

                // Setup NPC animations
                const mixer = new THREE.AnimationMixer(vrm.scene);
                npcMixerRef.current = mixer;

                try {
                    const idleClip = await loadMixamoAnimation(ANIMATION_IDLE, vrm);
                    if (idleClip) {
                        const action = mixer.clipAction(idleClip);
                        action.setLoop(THREE.LoopRepeat, Infinity);
                        action.play();
                    }
                } catch (e) {
                    console.log('NPC idle animation failed', e);
                }
            },
            undefined,
            (error) => console.error('Error loading NPC:', error)
        );
    };

    // Send message to NPC (handles streaming response)
    const sendNpcMessage = async (message: string) => {
        if (!message.trim() || isNpcTyping) return;

        const userMessage = { role: 'user' as const, content: message };
        setNpcChatMessages(prev => [...prev, userMessage]);
        setNpcChatInput('');
        setIsNpcTyping(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: `You are ${NPC_CONFIG.name}. ${NPC_CONFIG.personality}. Keep responses concise and friendly (1-3 sentences).` },
                        ...npcChatMessages.map(m => ({ role: m.role === 'npc' ? 'assistant' : 'user', content: m.content })),
                        { role: 'user', content: message }
                    ]
                })
            });

            if (response.ok && response.body) {
                // Handle streaming SSE response
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullResponse = '';

                // Add empty NPC message that we'll update
                setNpcChatMessages(prev => [...prev, { role: 'npc', content: '' }]);

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    const lines = chunk.split('\n').filter(line => line.trim());

                    for (const line of lines) {
                        if (!line.startsWith('data:')) continue;
                        const data = line.slice(5).trim();
                        if (data === '[DONE]') continue;

                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices?.[0]?.delta?.content || '';
                            if (content) {
                                fullResponse += content;
                                // Update the last message with accumulated content
                                setNpcChatMessages(prev => {
                                    const updated = [...prev];
                                    updated[updated.length - 1] = { role: 'npc', content: fullResponse };
                                    return updated;
                                });
                            }
                        } catch {
                            // Ignore parsing errors
                        }
                    }
                }

                if (!fullResponse) {
                    // If no response came through, use fallback
                    const fallbackMsg = "I'm here to help! What would you like to know about GiDiSpace?";
                    setNpcChatMessages(prev => {
                        const updated = [...prev];
                        updated[updated.length - 1] = { role: 'npc', content: fallbackMsg };
                        return updated;
                    });
                    playVoice(fallbackMsg);
                } else {
                    // Play voice for the complete response
                    playVoice(fullResponse);
                }
            } else {
                // Fallback response if API fails
                const fallbackResponses = [
                    "That's interesting! Tell me more about your interests.",
                    "Welcome to GiDiSpace! I'm here to help you navigate.",
                    "Feel free to explore the space and meet other GiDis!",
                    "Is there anything specific you'd like to know?",
                ];
                const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
                setNpcChatMessages(prev => [...prev, { role: 'npc', content: randomResponse }]);
                playVoice(randomResponse);
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMsg = "Sorry, I'm having trouble responding right now. Try again later!";
            setNpcChatMessages(prev => [...prev, { role: 'npc', content: errorMsg }]);
        }

        setIsNpcTyping(false);
    };

    // Create ambient floating objects
    const createAmbientObjects = (scene: THREE.Scene) => {
        // Floating orbs around the space
        const orbCount = 15;
        const orbs: THREE.Mesh[] = [];

        for (let i = 0; i < orbCount; i++) {
            const orbGeometry = new THREE.SphereGeometry(0.3 + Math.random() * 0.5, 32, 32);
            const orbMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(0.7 + Math.random() * 0.2, 0.8, 0.6),
                transparent: true,
                opacity: 0.4 + Math.random() * 0.3
            });
            const orb = new THREE.Mesh(orbGeometry, orbMaterial);

            const angle = (i / orbCount) * Math.PI * 2;
            const radius = 35 + Math.random() * 20;
            const height = 5 + Math.random() * 15;

            orb.position.set(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
            orb.userData.floatOffset = Math.random() * Math.PI * 2;
            orbs.push(orb);
            scene.add(orb);
        }

        return orbs;
    };

    // Initialize the 3D scene
    const initScene = useCallback(() => {
        if (!containerRef.current) return;

        // Clear any existing canvas (prevents duplicates)
        while (containerRef.current.firstChild) {
            containerRef.current.removeChild(containerRef.current.firstChild);
        }

        // Create scene with dark space background
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050510);
        sceneRef.current = scene;

        // Camera setup
        const camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            2000
        );
        camera.position.set(0, 8, 15);
        cameraRef.current = camera;

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({
            antialias: !isMobileDevice(),
            powerPreference: "high-performance",
        });
        const pixelRatio = Math.min(window.devicePixelRatio, isMobileDevice() ? 1.5 : 2);
        renderer.setPixelRatio(pixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Lighting for space lounge
        const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
        scene.add(ambientLight);

        // Main light from above (like a skylight)
        const mainLight = new THREE.DirectionalLight(0xffffff, 1);
        mainLight.position.set(0, 50, 0);
        scene.add(mainLight);

        // Accent lights (purple/blue tones)
        const accentLight1 = new THREE.PointLight(0x6366f1, 2, 50);
        accentLight1.position.set(15, 10, 15);
        scene.add(accentLight1);

        const accentLight2 = new THREE.PointLight(0x8b5cf6, 2, 50);
        accentLight2.position.set(-15, 10, -15);
        scene.add(accentLight2);

        // Rim light (subtle glow from edges)
        const rimLight = new THREE.HemisphereLight(0x6366f1, 0x1a1a2e, 0.3);
        scene.add(rimLight);

        // Create environment
        createStarfield(scene);
        createLoungeFloor(scene);
        const orbs = createAmbientObjects(scene);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.minDistance = 3;
        controls.maxDistance = 50;
        controls.maxPolarAngle = Math.PI * 0.85;
        controls.target.set(0, 1, 0);
        controls.enablePan = false;
        controlsRef.current = controls;

        // Load VRM avatar
        const loader = new GLTFLoader();
        loader.crossOrigin = 'anonymous';
        loader.register((parser) => new VRMLoaderPlugin(parser, { autoUpdateHumanBones: true }));

        const avatarPath = profile?.selected_avatar_model || '/avatars/raiden.vrm';
        console.log('Loading avatar from:', avatarPath);

        loader.load(
            avatarPath,
            async (gltf) => {
                console.log('GLTF loaded, checking for VRM...');
                const vrm = gltf.userData.vrm;

                if (!vrm) {
                    console.error('No VRM data found in GLTF!');
                    setIsLoading(false);
                    return;
                }

                console.log('VRM loaded successfully:', vrm);
                scene.add(vrm.scene);
                avatarRef.current = vrm;

                vrm.scene.traverse((obj: THREE.Object3D) => {
                    obj.frustumCulled = false;
                });

                VRMUtils.rotateVRM0(vrm);
                vrm.scene.position.set(0, 0, 0);

                // Add name label above avatar
                const nameLabel = createNameLabel(profile?.username || 'Anonymous');
                nameLabel.position.set(0, 1.8, 0); // Position above head
                vrm.scene.add(nameLabel);

                console.log('Avatar added to scene at position:', vrm.scene.position);

                // Initialize animations
                const mixer = new THREE.AnimationMixer(vrm.scene);
                mixerRef.current = mixer;

                // Load idle animation
                try {
                    console.log('Loading idle animation...');
                    const idleClip = await loadMixamoAnimation(ANIMATION_IDLE, vrm);
                    if (idleClip) {
                        const idleAction = mixer.clipAction(idleClip);
                        idleAction.setLoop(THREE.LoopRepeat, Infinity);
                        animationActionsRef.current.set('idle', idleAction);
                        idleAction.play();
                        console.log('Idle animation loaded and playing');
                    }
                } catch (e) {
                    console.log('Idle animation failed:', e);
                }

                // Load walking animation
                try {
                    console.log('Loading walking animation...');
                    const walkClip = await loadMixamoAnimation(ANIMATION_WALKING, vrm);
                    if (walkClip) {
                        const walkAction = mixer.clipAction(walkClip);
                        walkAction.setLoop(THREE.LoopRepeat, Infinity);
                        animationActionsRef.current.set('walking', walkAction);
                        console.log('Walking animation loaded');
                    }
                } catch (e) {
                    console.log('Walking animation failed:', e);
                }

                setIsLoading(false);
                console.log('Loading complete!');

                // Load NPC after player avatar is loaded
                loadNPC(scene, loader);
            },
            (progress) => {
                const pct = progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : 0;
                console.log('Loading avatar:', pct + '%', `(${progress.loaded}/${progress.total})`);
            },
            (error) => {
                console.error('Error loading avatar:', error);
                setIsLoading(false);
            }
        );

        // Keyboard event handlers
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't capture keys if typing in chat
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            // F to interact with NPC
            if (e.key.toLowerCase() === 'f' && isNearNpcRef.current && !showNpcChatRef.current) {
                setShowNpcChat(true);
                return;
            }

            // Escape to close chat
            if (e.key === 'Escape' && showNpcChatRef.current) {
                setShowNpcChat(false);
                return;
            }

            keysPressed.current.add(e.key.toLowerCase());
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keysPressed.current.delete(e.key.toLowerCase());
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Animation loop
        let animationId: number;
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            const delta = clockRef.current.getDelta();
            const time = clockRef.current.getElapsedTime();

            // Update mixers
            if (mixerRef.current) {
                mixerRef.current.update(delta);
            }
            if (npcMixerRef.current) {
                npcMixerRef.current.update(delta);
            }

            // Check proximity to NPC
            if (avatarRef.current && npcRef.current) {
                const playerPos = avatarRef.current.scene.position;
                const npcPos = npcRef.current.scene.position;
                const distance = playerPos.distanceTo(npcPos);
                setIsNearNpc(distance < NPC_INTERACTION_DISTANCE);
            }

            // WASD Movement
            if (avatarRef.current) {
                const avatar = avatarRef.current.scene;
                const moveDistance = MOVE_SPEED * delta;

                // Get camera direction for relative movement
                const cameraDirection = new THREE.Vector3();
                camera.getWorldDirection(cameraDirection);
                cameraDirection.y = 0; // Keep movement on horizontal plane
                cameraDirection.normalize();

                // Get right vector
                const rightVector = new THREE.Vector3();
                rightVector.crossVectors(cameraDirection, new THREE.Vector3(0, 1, 0)).normalize();

                // Calculate movement direction
                const movementDir = new THREE.Vector3();
                const isMoving = keysPressed.current.has('w') || keysPressed.current.has('s') ||
                                 keysPressed.current.has('a') || keysPressed.current.has('d');

                if (keysPressed.current.has('w')) movementDir.add(cameraDirection);
                if (keysPressed.current.has('s')) movementDir.sub(cameraDirection);
                if (keysPressed.current.has('a')) movementDir.sub(rightVector);
                if (keysPressed.current.has('d')) movementDir.add(rightVector);

                if (isMoving && movementDir.length() > 0) {
                    movementDir.normalize();

                    // Move avatar
                    avatar.position.add(movementDir.clone().multiplyScalar(moveDistance));

                    // Rotate avatar to face movement direction
                    const targetRotation = Math.atan2(movementDir.x, movementDir.z);
                    avatar.rotation.y = THREE.MathUtils.lerp(avatar.rotation.y, targetRotation, 0.15);

                    // Keep avatar on platform (clamp to radius)
                    const distFromCenter = Math.sqrt(avatar.position.x ** 2 + avatar.position.z ** 2);
                    if (distFromCenter > 28) {
                        const angle = Math.atan2(avatar.position.z, avatar.position.x);
                        avatar.position.x = Math.cos(angle) * 28;
                        avatar.position.z = Math.sin(angle) * 28;
                    }

                    // Switch to walking animation
                    switchAnimation('walking');
                } else {
                    // Switch to idle animation when not moving
                    switchAnimation('idle');
                }

                // Update camera to follow avatar
                controls.target.set(avatar.position.x, avatar.position.y + 1, avatar.position.z);
            }

            // Animate floating orbs
            orbs.forEach((orb, i) => {
                orb.position.y += Math.sin(time * 0.5 + orb.userData.floatOffset) * 0.002;
            });

            // Slowly rotate stars for subtle movement
            const stars = scene.children.find(child => child instanceof THREE.Points);
            if (stars) {
                stars.rotation.y += 0.0001;
            }

            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
            if (!cameraRef.current || !rendererRef.current) return;
            cameraRef.current.aspect = window.innerWidth / window.innerHeight;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            cancelAnimationFrame(animationId);
            renderer.dispose();
            if (containerRef.current && renderer.domElement) {
                containerRef.current.removeChild(renderer.domElement);
            }
        };
    }, [profile?.selected_avatar_model]);

    useEffect(() => {
        const cleanup = initScene();
        return () => {
            if (cleanup) cleanup();
        };
    }, [initScene]);

    return (
        <div className="relative w-full h-screen">
            {/* 3D Canvas Container */}
            <div ref={containerRef} className="w-full h-full" />

            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-50">
                    <div className="text-center">
                        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-white text-lg">Entering GiDiSpace...</p>
                    </div>
                </div>
            )}

            {/* UI Overlay */}
            <div className="absolute top-4 left-4 z-10">
                <div className="bg-gray-900/80 backdrop-blur-sm rounded-lg p-4 border border-purple-500/30">
                    <h1 className="text-white font-bold text-lg">GiDiSpace</h1>
                    <p className="text-gray-400 text-sm">
                        {profile?.username ? `Welcome, ${profile.username}` : 'The Space Lounge'}
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
                <button
                    onClick={() => setShowChat(!showChat)}
                    className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-colors"
                    title="Toggle Chat"
                >
                    <MessageCircle className="w-6 h-6" />
                </button>
                <button
                    className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-full shadow-lg transition-colors"
                    title="Nearby GiDis"
                >
                    <Users className="w-6 h-6" />
                </button>
            </div>

            {/* Chat Panel */}
            {showChat && (
                <div className="absolute bottom-4 left-4 z-10 w-96 h-96">
                    <RoomChat lobbyId="gidispace-main" />
                </div>
            )}

            {/* Press F to Talk - shown when near NPC */}
            {isNearNpc && !showNpcChat && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                    <div className="bg-gray-900/90 backdrop-blur-sm rounded-lg px-6 py-4 border border-purple-500/50 text-center animate-pulse">
                        <p className="text-white text-lg font-bold">Press <span className="text-purple-400 bg-purple-900/50 px-2 py-1 rounded">F</span> to talk to {NPC_CONFIG.name}</p>
                    </div>
                </div>
            )}

            {/* NPC Chat Modal */}
            {showNpcChat && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-30">
                    <div className="bg-gray-900 rounded-xl border border-purple-500/30 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
                        {/* Chat Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-700">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center ${isSpeaking ? 'animate-pulse ring-2 ring-purple-400' : ''}`}>
                                    <span className="text-white font-bold">{NPC_CONFIG.name[0]}</span>
                                </div>
                                <div>
                                    <h3 className="text-white font-bold">{NPC_CONFIG.name}</h3>
                                    <p className="text-gray-400 text-xs">
                                        {isSpeaking ? 'Speaking...' : 'GiDiSpace Guide'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Voice Toggle */}
                                <button
                                    onClick={() => {
                                        if (isSpeaking) stopVoice();
                                        setVoiceEnabled(!voiceEnabled);
                                    }}
                                    className={`p-2 rounded-lg transition-colors ${voiceEnabled ? 'text-purple-400 hover:text-purple-300' : 'text-gray-500 hover:text-gray-400'}`}
                                    title={voiceEnabled ? 'Voice enabled (click to mute)' : 'Voice muted (click to enable)'}
                                >
                                    {voiceEnabled ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                                        </svg>
                                    ) : (
                                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                            <line x1="23" y1="9" x2="17" y2="15" />
                                            <line x1="17" y1="9" x2="23" y2="15" />
                                        </svg>
                                    )}
                                </button>
                                {/* Close */}
                                <button
                                    onClick={() => {
                                        stopVoice();
                                        setShowNpcChat(false);
                                    }}
                                    className="text-gray-400 hover:text-white p-2"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
                            {npcChatMessages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                        msg.role === 'user'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-gray-700 text-gray-100'
                                    }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isNpcTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-700 text-gray-100 rounded-lg px-4 py-2">
                                        <span className="animate-pulse">...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Chat Input */}
                        <div className="p-4 border-t border-gray-700">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={npcChatInput}
                                    onChange={(e) => setNpcChatInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            sendNpcMessage(npcChatInput);
                                        }
                                    }}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                                    autoFocus
                                />
                                <button
                                    onClick={() => sendNpcMessage(npcChatInput)}
                                    disabled={isNpcTyping || !npcChatInput.trim()}
                                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                                >
                                    Send
                                </button>
                            </div>
                            <p className="text-gray-500 text-xs mt-2">Press Escape to close</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gray-900/60 backdrop-blur-sm rounded-lg px-4 py-2 text-gray-300 text-sm">
                    <span className="font-bold text-purple-400">WASD</span> to move •
                    <span className="font-bold text-purple-400"> Mouse</span> to look •
                    <span className="font-bold text-purple-400"> Scroll</span> to zoom •
                    <span className="font-bold text-purple-400"> F</span> to talk
                </div>
            </div>
        </div>
    );
};

export default SpaceLounge;
