'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Camera, Mail, Globe, MapPin } from 'lucide-react';

export default function ProfilePage() {
    return (
        <div className="p-6 lg:p-8 max-w-3xl space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-[var(--fg)]">Profile</h1>
                <p className="text-[var(--muted-fg)] mt-1">
                    Manage your public profile and personal information.
                </p>
            </div>

            {/* Avatar Section */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                                U
                            </div>
                            <button className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="w-5 h-5 text-white" />
                            </button>
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-[var(--fg)]">User</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="primary">Creator</Badge>
                                <span className="text-sm text-[var(--muted-fg)]">Member since Feb 2026</span>
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
                        <Input label="Full Name" defaultValue="User" icon={<Mail className="w-4 h-4" />} />
                        <Input label="Email" defaultValue="user@example.com" type="email" disabled />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input label="Website" placeholder="https://yoursite.com" icon={<Globe className="w-4 h-4" />} />
                        <Input label="Location" placeholder="San Francisco, CA" icon={<MapPin className="w-4 h-4" />} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[var(--fg)] mb-1.5">Bio</label>
                        <textarea
                            rows={3}
                            placeholder="Tell us about yourself..."
                            className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-sm text-[var(--fg)] placeholder:text-[var(--muted-fg)] focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all resize-none"
                        />
                    </div>
                    <div className="flex justify-end pt-2">
                        <Button>Save Changes</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
