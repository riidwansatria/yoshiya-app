import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user && request.nextUrl.pathname.startsWith('/api')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isProtectedAppPath =
        pathname.startsWith('/reservations') ||
        pathname.startsWith('/kitchen') ||
        pathname.startsWith('/procurement') ||
        pathname.startsWith('/customers') ||
        pathname.startsWith('/print')

    if (!user && isProtectedAppPath) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user && pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url))
    }

    if (!user && pathname === '/') {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return response
}

export const config = {
    matcher: [
        '/reservations/:path*',
        '/kitchen/:path*',
        '/procurement/:path*',
        '/customers',
        '/print/:path*',
        '/api/:path*',
        '/login',
        '/',
    ],
}
