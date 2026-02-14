'use default'
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const supabase = createClient()
        // Synthetic email: username becomes username@yoshiya.internal
        const email = `${username.toLowerCase().trim()}@yoshiya.internal`

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                console.error('Login error:', error)
                setError('ユーザー名またはパスワードが正しくありません')
            } else {
                router.push('/dashboard/banquet/schedule')
                router.refresh()
            }
        } catch (err) {
            console.error('Login exception:', err)
            setError('予期せぬエラーが発生しました')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
            <Card className="w-full max-w-sm shadow-lg">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold tracking-tight">よしや</CardTitle>
                    <CardDescription>Restaurant Management System</CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin} className="flex flex-col gap-6">
                    <CardContent className="grid gap-4">
                        {error && (
                            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                <span>{error}</span>
                            </div>
                        )}
                        <div className="grid gap-2">
                            <Label htmlFor="username">ユーザー名</Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={loading}
                                required
                                autoFocus
                                autoComplete="username"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="password">パスワード</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                required
                                autoComplete="current-password"
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full" type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            ログイン
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
