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

    const [isLoading, setIsLoading] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [nearbyGidis, setNearbyGidis] = useState<string[]>([]);

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
        gridHelper.material.opacity = 0.1;
        gridHelper.material.transparent = true;
        gridHelper.position.y = 0.01;
        scene.add(gridHelper);
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
        loader.load(
            avatarPath,
            async (gltf) => {
                const vrm = gltf.userData.vrm;
                scene.add(vrm.scene);
                avatarRef.current = vrm;

                vrm.scene.traverse((obj: THREE.Object3D) => {
                    obj.frustumCulled = false;
                });

                VRMUtils.rotateVRM0(vrm);
                vrm.scene.position.set(0, 0, 0);

                // Initialize animations
                const mixer = new THREE.AnimationMixer(vrm.scene);
                mixerRef.current = mixer;

                // Try to load idle animation
                try {
                    const idleClip = await loadMixamoAnimation(ANIMATION_IDLE, vrm);
                    if (idleClip) {
                        const idleAction = mixer.clipAction(idleClip);
                        idleAction.play();
                        animationActionsRef.current.set('idle', idleAction);
                    }
                } catch (e) {
                    console.log('Idle animation not found, avatar will be static');
                }

                setIsLoading(false);
            },
            (progress) => {
                console.log('Loading avatar:', Math.round((progress.loaded / progress.total) * 100) + '%');
            },
            (error) => {
                console.error('Error loading avatar:', error);
                setIsLoading(false);
            }
        );

        // Animation loop
        let animationId: number;
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            const delta = clockRef.current.getDelta();
            const time = clockRef.current.getElapsedTime();

            // Update mixer
            if (mixerRef.current) {
                mixerRef.current.update(delta);
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
                    <RoomChat />
                </div>
            )}

            {/* Instructions */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gray-900/60 backdrop-blur-sm rounded-lg px-4 py-2 text-gray-300 text-sm">
                    Click and drag to look around • Scroll to zoom
                </div>
            </div>
        </div>
    );
};

export default SpaceLounge;
