'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Camera, User, Globe, Loader2, LogOut, Save, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function ProfilePage() {
    const { user, profile, loading, signOut, refreshProfile } = useAuth();

    const [fullName, setFullName] = useState('');
    const [website, setWebsite] = useState('');
    const [bio, setBio] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [signingOut, setSigningOut] = useState(false);
    const [profileReady, setProfileReady] = useState(false);
    const saveAbortRef = useRef<AbortController | null>(null);

    // Sync state from profile when it loads
    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setWebsite(profile.website || '');
            setBio(profile.bio || '');
            setProfileReady(true);
        }
    }, [profile]);

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-20" role="status" aria-label="Loading profile">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    const displayName = fullName || profile?.full_name || 'Anonymous User';
    const initial = displayName.charAt(0).toUpperCase();

    const handleSave = async () => {
        if (!user || saving) return;

        const trimmedName = fullName.trim();
        const trimmedWebsite = website.trim();
        const trimmedBio = bio.trim();

        if (!trimmedName) {
            setSaveError('Name cannot be empty.');
            return;
        }

        if (saveAbortRef.current) {
            saveAbortRef.current.abort();
        }
        const controller = new AbortController();
        saveAbortRef.current = controller;

        setSaving(true);
        setSaveError('');
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: trimmedName,
                    website: trimmedWebsite || null,
                    bio: trimmedBio || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', user.id);

            if (error) {
                const errMsg = error.message || error.details || error.hint || JSON.stringify(error);
                console.error('[Profile] Save error:', errMsg);
                setSaveError('Failed to save changes. Please try again.');
                return;
            }

            if (controller.signal.aborted) return;

            await refreshProfile();
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (err) {
            console.error('[Profile] Save exception:', err);
            setSaveError('An unexpected error occurred. Please try again.');
        } finally {
            if (!controller.signal.aborted) {
                setSaving(false);
            }
        }
    };

    const handleLogout = async () => {
        setSigningOut(true);
        try {
            await signOut();
        } catch {
            setSigningOut(false);
        }
    };

    return (
        <div className="p-6 lg:p-8 max-w-3xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--fg)]">Profile</h1>
                    <p className="text-[var(--muted-fg)] mt-1">
                        Manage your public profile and personal information.
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={handleLogout}
                    disabled={signingOut}
                    className="border-red-500/20 text-red-500 hover:bg-red-500/5 hover:border-red-500 gap-2"
                >
                    {signingOut ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <LogOut className="w-4 h-4" />
                    )}
                    {signingOut ? 'Logging out...' : 'Logout'}
                </Button>
            </div>

            {/* Avatar Section */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg overflow-hidden">
                                {profile?.avatar_url ? (
                                    <Image src={profile.avatar_url} alt={displayName} width={80} height={80} className="w-full h-full object-cover" />
                                ) : (
                                    initial
                                )}
                            </div>
                            <button className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--fg)]">
                                {profileReady ? displayName : <div className="w-24 h-6 bg-[var(--muted)] rounded animate-pulse" />}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="primary" className="uppercase tracking-widest text-[10px] font-black">
                                    {profile?.role || 'User'}
                                </Badge>
                                <span className="text-sm text-[var(--muted-fg)]">Member of AION</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Profile Info */}
            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Full Name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Your full name"
                            icon={<User className="w-4 h-4 opacity-50" />}
                        />
                        <Input
                            label="Email"
                            defaultValue={user?.email || profile?.email || ''}
                            type="email"
                            disabled
                        />
                    </div>
                    <Input
                        label="Website"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://yoursite.com"
                        icon={<Globe className="w-4 h-4 font-normal" />}
                    />
                    <div>
                        <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">Bio</label>
                        <textarea
                            rows={3}
                            placeholder="Tell us about yourself..."
                            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--fg)] placeholder:text-[var(--muted-fg)] focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all resize-none"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div className="min-h-[20px]">
                            {saveError && (
                                <p className="text-sm text-red-500">{saveError}</p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            {saved && (
                                <span className="flex items-center gap-1.5 text-sm text-green-500">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Saved!
                                </span>
                            )}
                            <Button onClick={handleSave} disabled={saving} className="gap-2">
                                {saving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
