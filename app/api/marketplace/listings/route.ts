import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const url = new URL(req.url);

        // Query params
        const category = url.searchParams.get('category');
        const search = url.searchParams.get('search');
        const sort = url.searchParams.get('sort') || 'newest'; // newest, price_low, price_high, rating, popular
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '12');
        const tag = url.searchParams.get('tag');

        const offset = (page - 1) * limit;

        // Build query — fetch active listings with seller profiles
        let query = supabase
            .from('marketplace_listings')
            .select(`
                *,
                seller:profiles!marketplace_listings_seller_id_fkey (
                    id,
                    full_name,
                    avatar_url,
                    email
                ),
                workflow:workflows!marketplace_listings_workflow_id_fkey (
                    id,
                    name,
                    tags
                )
            `, { count: 'exact' })
            .eq('is_active', true);

        // Category filter
        if (category && category !== 'All') {
            query = query.eq('category', category);
        }

        // Search filter
        if (search) {
            query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
        }

        // Tag filter
        if (tag) {
            query = query.contains('tags', [tag]);
        }

        // Sorting
        switch (sort) {
            case 'price_low':
                query = query.order('price', { ascending: true });
                break;
            case 'price_high':
                query = query.order('price', { ascending: false });
                break;
            case 'rating':
                query = query.order('rating_avg', { ascending: false });
                break;
            case 'popular':
                query = query.order('usage_count', { ascending: false });
                break;
            case 'newest':
            default:
                query = query.order('created_at', { ascending: false });
                break;
        }

        // Pagination
        query = query.range(offset, offset + limit - 1);

        const { data: listings, error, count } = await query;

        if (error) throw error;

        return NextResponse.json({
            listings: listings || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit),
        });
    } catch (error: any) {
        console.error('[MARKETPLACE LISTINGS ERROR]', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch listings' },
            { status: 500 }
        );
    }
}
