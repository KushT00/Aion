'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';

interface Step1ProfileProps {
    onNext: (data: ProfileData) => void;
    initialData?: ProfileData;
}

export interface ProfileData {
    fullName: string;
    expertise: string;
    skills: string[];
    experienceYears: number;
    description: string;
    workStyle: string;
    specialization: string[];
}

const expertiseOptions = [
    'Content Writer',
    'Data Analyst',
    'Graphic Designer',
    'Social Media Manager',
    'Software Developer',
    'Virtual Assistant',
    'Video Editor',
    'SEO Specialist',
    'Customer Support',
    'Other'
];

const workStyleOptions = [
    'Fast-paced',
    'Detail-oriented',
    'Creative',
    'Analytical',
    'Collaborative',
    'Independent'
];

const specializationOptions = [
    'Technology',
    'Healthcare',
    'Finance',
    'Education',
    'E-commerce',
    'Marketing',
    'Real Estate',
    'Entertainment',
    'Travel',
    'Food & Beverage'
];

export function Step1Profile({ onNext, initialData }: Step1ProfileProps) {
    const [formData, setFormData] = useState<ProfileData>(initialData || {
        fullName: '',
        expertise: '',
        skills: [],
        experienceYears: 0,
        description: '',
        workStyle: '',
        specialization: []
    });

    const [skillInput, setSkillInput] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleAddSkill = () => {
        if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
            setFormData(prev => ({
                ...prev,
                skills: [...prev.skills, skillInput.trim()]
            }));
            setSkillInput('');
        }
    };

    const handleRemoveSkill = (skill: string) => {
        setFormData(prev => ({
            ...prev,
            skills: prev.skills.filter(s => s !== skill)
        }));
    };

    const toggleSpecialization = (spec: string) => {
        setFormData(prev => ({
            ...prev,
            specialization: prev.specialization.includes(spec)
                ? prev.specialization.filter(s => s !== spec)
                : [...prev.specialization, spec]
        }));
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.fullName.trim()) newErrors.fullName = 'Name is required';
        if (!formData.expertise) newErrors.expertise = 'Please select your expertise';
        if (formData.skills.length === 0) newErrors.skills = 'Add at least one skill';
        if (formData.experienceYears < 0) newErrors.experienceYears = 'Experience must be positive';
        if (!formData.description.trim() || formData.description.length < 50) {
            newErrors.description = 'Description must be at least 50 characters';
        }
        if (!formData.workStyle) newErrors.workStyle = 'Please select your work style';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onNext(formData);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-500/10 mb-4">
                    <Sparkles className="w-8 h-8 text-primary-500" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--fg)] mb-2">
                    Tell Us About Yourself
                </h2>
                <p className="text-[var(--muted-fg)]">
                    Help us understand your expertise so we can create your perfect AI clone
                </p>
            </div>

            {/* Full Name */}
            <div>
                <label className="block text-sm font-medium text-[var(--fg)] mb-2">
                    Full Name *
                </label>
                <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                />
                {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
            </div>

            {/* Expertise */}
            <div>
                <label className="block text-sm font-medium text-[var(--fg)] mb-2">
                    Primary Expertise *
                </label>
                <select
                    value={formData.expertise}
                    onChange={(e) => setFormData(prev => ({ ...prev, expertise: e.target.value }))}
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                >
                    <option value="">Select your expertise</option>
                    {expertiseOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                {errors.expertise && <p className="text-red-500 text-sm mt-1">{errors.expertise}</p>}
            </div>

            {/* Skills */}
            <div>
                <label className="block text-sm font-medium text-[var(--fg)] mb-2">
                    Skills * (Add at least 3)
                </label>
                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                        placeholder="e.g., SEO, Blog Writing, Research"
                        className="flex-1 bg-[var(--muted)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                    />
                    <Button type="button" onClick={handleAddSkill}>
                        Add
                    </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {formData.skills.map(skill => (
                        <span
                            key={skill}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-500/10 text-primary-500 rounded-full text-sm"
                        >
                            {skill}
                            <button
                                type="button"
                                onClick={() => handleRemoveSkill(skill)}
                                className="hover:text-red-500 transition-colors"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
                {errors.skills && <p className="text-red-500 text-sm mt-1">{errors.skills}</p>}
            </div>

            {/* Experience Years */}
            <div>
                <label className="block text-sm font-medium text-[var(--fg)] mb-2">
                    Years of Experience *
                </label>
                <input
                    type="number"
                    min="0"
                    max="50"
                    value={formData.experienceYears}
                    onChange={(e) => setFormData(prev => ({ ...prev, experienceYears: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                />
                {errors.experienceYears && <p className="text-red-500 text-sm mt-1">{errors.experienceYears}</p>}
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-[var(--fg)] mb-2">
                    Describe Your Work * (Min 50 characters)
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Tell us about what you do, your approach, and what makes your work unique..."
                    rows={5}
                    className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-primary-500/50 resize-none"
                />
                <p className="text-xs text-[var(--muted-fg)] mt-1">
                    {formData.description.length} / 50 characters minimum
                </p>
                {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            {/* Work Style */}
            <div>
                <label className="block text-sm font-medium text-[var(--fg)] mb-2">
                    Work Style *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {workStyleOptions.map(style => (
                        <button
                            key={style}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, workStyle: style }))}
                            className={`px-4 py-3 rounded-lg border-2 transition-all ${formData.workStyle === style
                                    ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                                    : 'border-[var(--border)] hover:border-primary-500/30'
                                }`}
                        >
                            {style}
                        </button>
                    ))}
                </div>
                {errors.workStyle && <p className="text-red-500 text-sm mt-1">{errors.workStyle}</p>}
            </div>

            {/* Specialization */}
            <div>
                <label className="block text-sm font-medium text-[var(--fg)] mb-2">
                    Industry Specialization (Optional)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {specializationOptions.map(spec => (
                        <button
                            key={spec}
                            type="button"
                            onClick={() => toggleSpecialization(spec)}
                            className={`px-4 py-3 rounded-lg border-2 transition-all ${formData.specialization.includes(spec)
                                    ? 'border-primary-500 bg-primary-500/10 text-primary-500'
                                    : 'border-[var(--border)] hover:border-primary-500/30'
                                }`}
                        >
                            {spec}
                        </button>
                    ))}
                </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-6 border-t border-[var(--border)]">
                <Button type="submit" size="lg" className="gap-2">
                    Continue to Work Samples
                    <ArrowRight className="w-4 h-4" />
                </Button>
            </div>
        </form>
    );
}
