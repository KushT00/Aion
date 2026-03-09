'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Camera, Mail, Globe, MapPin, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function ProfilePage() {
    const { user, profile, loading, signOut } = useAuth();

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center p-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    const name = profile?.full_name || 'Anonymous User';
    const initial = name.charAt(0).toUpperCase();

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
                    onClick={() => signOut()}
                    className="border-red-500/20 text-red-500 hover:bg-red-500/5 hover:border-red-500 gap-2"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </Button>
            </div>

            {/* Avatar Section */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg overflow-hidden">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt={name} className="w-full h-full object-cover" />
                                ) : (
                                    initial
                                )}
                            </div>
                            <button className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--fg)]">{name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="primary" className="uppercase tracking-widest text-[10px] font-black">{profile?.role || 'User'}</Badge>
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
                        <Input label="Full Name" defaultValue={name} disabled icon={<Mail className="w-4 h-4 opacity-50" />} />
                        <Input label="Email" defaultValue={user?.email || profile?.email || ''} type="email" disabled />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Website" defaultValue={profile?.website || ''} placeholder="https://yoursite.com" icon={<Globe className="w-4 h-4 font-normal" />} />
                        <Input label="Location" placeholder="San Francisco, CA" icon={<MapPin className="w-4 h-4 font-normal" />} disabled />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">Bio</label>
                        <textarea
                            rows={3}
                            placeholder="Tell us about yourself..."
                            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--fg)] placeholder:text-[var(--muted-fg)] focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all resize-none"
                            defaultValue={profile?.bio || ''}
                            disabled
                        />
                    </div>
                    {/* Add Save Changes button for future implementation */}
                    <div className="flex justify-end pt-2">
                        <Button disabled>Save Changes</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
