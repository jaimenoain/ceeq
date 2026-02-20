'use client'

import { useFormState } from 'react-dom'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signup } from '../actions'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card'

const initialState = {
  error: '',
}

export default function SignupPage() {
  const router = useRouter()
  const [state, formAction] = useFormState(signup, initialState)

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
      router.push('/searcher/dashboard')
    }
  }, [router])

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Sign Up</CardTitle>
        <CardDescription>
          Enter your information to create an account
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent>
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                placeholder="name@example.com"
                required
                type="email"
              />
            </div>
            <div className="flex flex-col space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                required
                type="password"
              />
            </div>
            {state?.error && (
              <p className="text-sm font-medium text-destructive">
                {state.error}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" type="submit">
            Sign Up
          </Button>
          <div className="text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Log in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
