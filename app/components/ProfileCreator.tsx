// app/components/ProfileCreator.tsx - GiDiSpace Profile Creator with PDF Upload

"use client";

import { useState, useEffect, useCallback } from 'react';
import { useLobbyStore } from '@/lib/lobbyStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, X, Loader2, Mic, Square } from 'lucide-react';

interface ProfileCreatorProps {
    onComplete: () => void;
    editingProfile?: any;
    isEditing?: boolean;
}

const ProfileCreator = ({ onComplete, editingProfile, isEditing = false }: ProfileCreatorProps) => {
    const { createProfile, profile, loadProfile } = useLobbyStore();
    const [step, setStep] = useState(1);
    const [isCreating, setIsCreating] = useState(false);

    // Profile data
    const [username, setUsername] = useState(editingProfile?.username || '');
    const [selectedAvatar, setSelectedAvatar] = useState(editingProfile?.selected_avatar_model || '/avatars/raiden.vrm');
    const [personality, setPersonality] = useState(editingProfile?.ai_personality_prompt || '');
    const [interests, setInterests] = useState<string[]>(editingProfile?.interests || []);
    const [bio, setBio] = useState(editingProfile?.bio || '');
    const [isCustomPersonality, setIsCustomPersonality] = useState(false);

    // PDF Upload state
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [extractedText, setExtractedText] = useState('');
    const [isProcessingPdf, setIsProcessingPdf] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    // Voice capture state
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
    const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
    const [voiceId, setVoiceId] = useState<string | null>(editingProfile?.voice_id || null);
    const [voiceStatus, setVoiceStatus] = useState<string>('');

    const avatarOptions = [
        {
            id: '1',
            model: '/avatars/raiden.vrm',
            name: 'Raiden',
            preview: '/avatar-previews/raiden.webp',
        },
        {
            id: '2',
            model: '/avatars/ayato.vrm',
            name: 'Ayato',
            preview: '/avatar-previews/ayato.webp',
        },
        {
            id: '3',
            model: '/avatars/kazuha.vrm',
            name: 'Kazuha',
            preview: '/avatar-previews/kazuha.webp',
        },
        {
            id: '4',
            model: '/avatars/eula.vrm',
            name: 'Eula',
            preview: '/avatar-previews/eula.webp',
        }
    ];

    const personalityTemplates = [
        { label: "Friendly Explorer", value: "friendly and curious, loves meeting new people and exploring virtual worlds" },
        { label: "Tech Enthusiast", value: "passionate about technology, AI, and the future of digital experiences" },
        { label: "Creative Artist", value: "artistic soul who enjoys creating and sharing creative experiences" },
        { label: "Chill Conversationalist", value: "laid-back and enjoys having meaningful conversations" },
        { label: "Knowledge Seeker", value: "always learning, asking questions, and sharing interesting insights" },
        { label: "Custom", value: "" }
    ];

    const interestOptions = [
        "🤖 AI/Tech", "💼 Business", "🎨 Art & Design", "🎵 Music",
        "📚 Learning", "💬 Networking", "🌍 Travel", "🔬 Science",
        "📊 Data", "📖 Writing", "🎬 Entertainment", "💡 Innovation"
    ];

    // Handle PDF file upload
    const handleFileUpload = useCallback(async (file: File) => {
        if (file.type !== 'application/pdf') {
            alert('Please upload a PDF file');
            return;
        }

        setUploadedFile(file);
        setIsProcessingPdf(true);

        try {
            // Create FormData and send to API for processing
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/extract-pdf', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const { text } = await response.json();
                setExtractedText(text);
                // Append to bio
                setBio((prev: string) => prev ? `${prev}\n\n--- From uploaded PDF ---\n${text}` : text);
            } else {
                throw new Error('Failed to process PDF');
            }
        } catch (error) {
            console.error('Error processing PDF:', error);
            alert('Failed to process PDF. You can still paste your information manually.');
        } finally {
            setIsProcessingPdf(false);
        }
    }, []);

    // Drag and drop handlers
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    }, [handleFileUpload]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFileUpload(e.target.files[0]);
        }
    }, [handleFileUpload]);

    const removeFile = useCallback(() => {
        setUploadedFile(null);
        setExtractedText('');
    }, []);

    // Initialize custom personality state when editing
    useEffect(() => {
        if (editingProfile?.ai_personality_prompt) {
            const fullPrompt = editingProfile.ai_personality_prompt;
            const personalityMatch = fullPrompt.match(/Personality: ([^.]+\.)/);
            let extractedPersonality = '';

            if (personalityMatch) {
                extractedPersonality = personalityMatch[1].replace(/\.$/, '').trim();
            }

            const matchingTemplate = personalityTemplates.slice(0, -1)
                .find(template => template.value === extractedPersonality);

            if (matchingTemplate) {
                setPersonality(matchingTemplate.value);
                setIsCustomPersonality(false);
            } else {
                setPersonality(extractedPersonality || editingProfile.ai_personality_prompt);
                setIsCustomPersonality(true);
            }
        }
    }, [editingProfile]);

    const handleCreateProfile = async () => {
        if (!username.trim()) {
            alert('Please enter a username');
            return;
        }

        setIsCreating(true);

        const profileData = {
            username: username.trim(),
            selected_avatar_model: selectedAvatar,
            personality: personality || personalityTemplates[0].value,
            bio: bio.trim(),
            interests: interests,
            ai_personality_prompt: `You are ${username.trim()}'s GiDi (digital twin).
                Personality: ${personality || personalityTemplates[0].value}.
                Background: ${bio || 'A friendly presence in GiDiSpace!'}
                Interests: ${interests.join(', ') || 'connecting with others'}.

                You represent this person when they're not online. Be helpful, authentic to their personality,
                and engage in meaningful conversations. Keep responses friendly and true to this persona.`
        };

        const success = await createProfile(
            profileData.username,
            profileData.selected_avatar_model,
            profileData.ai_personality_prompt,
            profileData.bio,
            profileData.interests,
            undefined, // cvText
            voiceId || undefined
        );

        if (success) {
            if (isEditing) {
                await loadProfile();
            }
            onComplete();
        } else {
            alert(isEditing ? 'Failed to update profile. Please try again.' : 'Failed to create profile. Try a different username.');
        }
        setIsCreating(false);
    };

    // If profile exists and we're not editing, show welcome back
    if (profile && !isEditing) {
        return (
            <Card className="w-full max-w-md mx-auto bg-gray-900/90 border-purple-500/30 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">
                        Welcome back, {profile.username}!
                    </h2>
                    <p className="text-gray-300 mb-4">
                        Your GiDi is ready to represent you in the space.
                    </p>
                    <Button onClick={onComplete} className="w-full bg-purple-600 hover:bg-purple-700">
                        Enter GiDiSpace
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-2xl mx-auto bg-gray-900/90 border-purple-500/30 backdrop-blur-sm max-h-[90vh] overflow-hidden flex flex-col">
            <CardHeader className="flex-shrink-0">
                <CardTitle className="text-2xl text-center text-white">
                    {isEditing ? 'Edit Your GiDi' : 'Create Your GiDi'}
                </CardTitle>
                <p className="text-center text-gray-300">
                    {isEditing
                        ? 'Update your digital twin settings'
                        : 'Your GiDi represents you in the space, even when you\'re offline'
                    }
                </p>
                <div className="flex justify-center gap-2 mt-4">
                    <Badge variant={step === 1 ? "default" : "outline"} className={step === 1 ? "bg-purple-600" : ""}>1. Identity</Badge>
                    <Badge variant={step === 2 ? "default" : "outline"} className={step === 2 ? "bg-purple-600" : ""}>2. Avatar</Badge>
                    <Badge variant={step === 3 ? "default" : "outline"} className={step === 3 ? "bg-purple-600" : ""}>3. Knowledge</Badge>
                </div>
            </CardHeader>
            <CardContent className="p-6 flex-1 overflow-y-auto">
                {/* Step 1: Username */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div>
                            <label className="text-white mb-2 block">Choose Your Name</label>
                            <Input
                                type="text"
                                placeholder="Enter your name..."
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-gray-800 border-gray-600 text-white"
                                maxLength={30}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                This is how others will see you in GiDiSpace
                            </p>
                        </div>

                        <Button
                            onClick={() => username.trim() && setStep(2)}
                            className="w-full bg-purple-600 hover:bg-purple-700"
                            disabled={!username.trim()}
                        >
                            Next: Choose Avatar
                        </Button>
                    </div>
                )}

                {/* Step 2: Avatar Selection */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div>
                            <label className="text-white mb-2 block">Select Your Avatar</label>
                            <div className="grid grid-cols-4 gap-4">
                                {avatarOptions.map(avatar => (
                                    <button
                                        key={avatar.id}
                                        onClick={() => setSelectedAvatar(avatar.model)}
                                        className={`p-4 rounded-lg border-2 transition-all ${
                                            selectedAvatar === avatar.model
                                                ? 'border-purple-500 bg-purple-500/20'
                                                : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                                        }`}
                                    >
                                        <img
                                            src={avatar.preview}
                                            alt={avatar.name}
                                            className="w-16 h-16 object-cover rounded mx-auto"
                                        />
                                        <div className="text-xs text-gray-300 text-center mt-2">{avatar.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={() => setStep(1)}
                                variant="outline"
                                className="flex-1"
                            >
                                Back
                            </Button>
                            <Button
                                onClick={() => setStep(3)}
                                className="flex-1 bg-purple-600 hover:bg-purple-700"
                            >
                                Next: Add Knowledge
                            </Button>
                        </div>
                    </div>
                )}

                {/* Step 3: Knowledge & Personality */}
                {step === 3 && (
                    <div className="space-y-6">
                        {/* PDF Upload Section */}
                        <div>
                            <label className="text-white mb-2 block">Upload Your Profile (PDF)</label>
                            <div
                                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                                    dragActive
                                        ? 'border-purple-500 bg-purple-500/10'
                                        : 'border-gray-600 hover:border-gray-500'
                                }`}
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                            >
                                {isProcessingPdf ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                                        <p className="text-gray-300">Processing PDF...</p>
                                    </div>
                                ) : uploadedFile ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <FileText className="w-8 h-8 text-purple-500" />
                                        <span className="text-gray-300">{uploadedFile.name}</span>
                                        <button
                                            onClick={removeFile}
                                            className="p-1 hover:bg-gray-700 rounded"
                                        >
                                            <X className="w-4 h-4 text-gray-400" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                        <p className="text-gray-300 mb-2">
                                            Drag & drop your resume/CV here
                                        </p>
                                        <p className="text-xs text-gray-500 mb-3">or</p>
                                        <label className="cursor-pointer">
                                            <span className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm">
                                                Browse Files
                                            </span>
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={handleFileInput}
                                                className="hidden"
                                            />
                                        </label>
                                    </>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                Your GiDi will use this information to represent you authentically
                            </p>
                        </div>

                        {/* Personality Selection */}
                        <div>
                            <label className="text-white mb-2 block">Communication Style</label>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                {personalityTemplates.map((template) => (
                                    <button
                                        key={template.label}
                                        onClick={() => {
                                            if (template.label === 'Custom') {
                                                setIsCustomPersonality(true);
                                            } else {
                                                setIsCustomPersonality(false);
                                                setPersonality(template.value);
                                            }
                                        }}
                                        className={`text-left p-2 rounded border text-sm ${
                                            (template.label === 'Custom' && isCustomPersonality) ||
                                            (!isCustomPersonality && personality === template.value)
                                                ? 'border-purple-500 bg-purple-500/20'
                                                : 'border-gray-600 bg-gray-800'
                                        }`}
                                    >
                                        <div className="text-white">{template.label}</div>
                                    </button>
                                ))}
                            </div>
                            {isCustomPersonality && (
                                <Textarea
                                    placeholder="Describe how your GiDi should communicate..."
                                    value={personality}
                                    onChange={(e) => setPersonality(e.target.value)}
                                    className="bg-gray-800 border-gray-600 text-white"
                                    rows={2}
                                />
                            )}
                        </div>

                        {/* Interests */}
                        <div>
                            <label className="text-white mb-2 block">Areas of Expertise (select up to 5)</label>
                            <div className="grid grid-cols-3 gap-2">
                                {interestOptions.map((interest) => (
                                    <button
                                        key={interest}
                                        onClick={() => {
                                            if (interests.includes(interest)) {
                                                setInterests(interests.filter(i => i !== interest));
                                            } else if (interests.length < 5) {
                                                setInterests([...interests, interest]);
                                            }
                                        }}
                                        className={`p-2 text-xs rounded border ${
                                            interests.includes(interest)
                                                ? 'border-purple-500 bg-purple-500/20 text-white'
                                                : 'border-gray-600 bg-gray-800 text-gray-300'
                                        }`}
                                        disabled={!interests.includes(interest) && interests.length >= 5}
                                    >
                                        {interest}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bio / Additional Info */}
                        <div>
                            <label className="text-white mb-2 block">Additional Information</label>
                            <Textarea
                                placeholder="Add any additional context about yourself... (or paste your bio/resume here)"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="bg-gray-800 border-gray-600 text-white"
                                rows={4}
                                maxLength={100000}
                            />
                            <p className="text-xs text-gray-400 mt-1">{bio.length.toLocaleString()} characters</p>
                        </div>

                        {/* Voice Recording & Cloning */}
                        <div>
                            <label className="text-white mb-2 block">Voice Sample (Optional)</label>
                            <p className="text-xs text-gray-400 mb-3">Record a short intro (30 seconds to 2 minutes). We'll clone your voice so your GiDi can speak like you!</p>
                            <div className="flex items-center gap-3 flex-wrap">
                                <Button
                                    type="button"
                                    variant={isRecording ? 'destructive' : 'default'}
                                    className={isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}
                                    onClick={async () => {
                                        if (isRecording && mediaRecorder) {
                                            mediaRecorder.stop();
                                            setIsRecording(false);
                                            return;
                                        }

                                        try {
                                            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                                            const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
                                            const recorder = new MediaRecorder(stream, { mimeType });
                                            const chunks: BlobPart[] = [];

                                            recorder.ondataavailable = (e) => {
                                                if (e.data.size > 0) chunks.push(e.data);
                                            };

                                            recorder.onstop = async () => {
                                                stream.getTracks().forEach(track => track.stop());
                                                const blob = new Blob(chunks, { type: mimeType });
                                                const url = URL.createObjectURL(blob);
                                                setRecordedAudioUrl(url);
                                                setVoiceStatus('Uploading to ElevenLabs...');

                                                try {
                                                    const formData = new FormData();
                                                    formData.append('file', blob, 'voice.webm');
                                                    formData.append('name', username || 'GiDi Voice');

                                                    const res = await fetch('/api/voice/clone', {
                                                        method: 'POST',
                                                        body: formData,
                                                    });

                                                    if (!res.ok) {
                                                        throw new Error(`Voice clone failed (${res.status})`);
                                                    }

                                                    const data = await res.json();
                                                    setVoiceId(data.voice_id || null);
                                                    setVoiceStatus(data.voice_id ? 'Voice cloned successfully!' : 'Clone failed');
                                                } catch (err) {
                                                    console.error('Voice clone error:', err);
                                                    setVoiceStatus('Voice clone failed. Try again.');
                                                }
                                            };

                                            recorder.start();
                                            setMediaRecorder(recorder);
                                            setIsRecording(true);
                                            setVoiceStatus('Recording...');
                                        } catch (err) {
                                            console.error('Mic error:', err);
                                            setVoiceStatus('Microphone access denied.');
                                        }
                                    }}
                                >
                                    {isRecording ? (
                                        <span className="flex items-center gap-2"><Square className="w-4 h-4" /> Stop</span>
                                    ) : (
                                        <span className="flex items-center gap-2"><Mic className="w-4 h-4" /> Record</span>
                                    )}
                                </Button>

                                {recordedAudioUrl && (
                                    <audio controls src={previewAudioUrl || recordedAudioUrl} className="h-10" />
                                )}

                                {voiceId && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            setVoiceStatus('Generating preview...');
                                            try {
                                                const resp = await fetch('/api/voice/preview', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ voice_id: voiceId, text: 'Hi, this is my GiDi voice!' }),
                                                });
                                                if (!resp.ok) throw new Error('Preview failed');
                                                const blob = await resp.blob();
                                                const url = URL.createObjectURL(blob);
                                                setPreviewAudioUrl(url);
                                                setVoiceStatus('Preview ready!');
                                            } catch (err) {
                                                console.error('Preview error:', err);
                                                setVoiceStatus('Preview failed.');
                                            }
                                        }}
                                    >
                                        Test Voice
                                    </Button>
                                )}
                            </div>
                            {voiceStatus && <p className="text-xs text-gray-300 mt-2">{voiceStatus}</p>}
                            {voiceId && <p className="text-xs text-green-400 mt-1">Voice ID: {voiceId}</p>}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={() => setStep(2)}
                                variant="outline"
                                className="flex-1"
                            >
                                Back
                            </Button>
                            <Button
                                onClick={handleCreateProfile}
                                disabled={isCreating}
                                className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                                {isCreating
                                    ? (isEditing ? 'Updating...' : 'Creating...')
                                    : (isEditing ? 'Update GiDi' : 'Create My GiDi')
                                }
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ProfileCreator;
