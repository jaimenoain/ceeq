"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { z } from "zod"

import { OnboardingSubmitSchema } from "../schemas"
import { completeOnboardingAction } from "../actions"
import { Button } from "@/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form"
import { Input } from "@/shared/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group"
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert"

type FormValues = z.infer<typeof OnboardingSubmitSchema>

export function OnboardingForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const form = useForm<FormValues>({
    resolver: zodResolver(OnboardingSubmitSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      workspaceName: "",
      linkedinUrl: "",
    },
  })

  async function onSubmit(data: FormValues) {
    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.append("firstName", data.firstName)
      formData.append("lastName", data.lastName)
      formData.append("workspaceName", data.workspaceName)
      formData.append("workspaceType", data.workspaceType)
      if (data.linkedinUrl) {
        formData.append("linkedinUrl", data.linkedinUrl)
      }

      const result = await completeOnboardingAction(formData)

      if (result.error) {
        setError(result.error)
        return
      }

      if (result.validationErrors) {
        Object.entries(result.validationErrors).forEach(([key, messages]) => {
          // @ts-expect-error key is string, but form expects keyof FormValues
            form.setError(key, { message: messages[0] })
        })
        return
      }

      if (result.success) {
        if (data.workspaceType === "SEARCHER") {
          router.push("/searcher/dashboard")
        } else {
          router.push("/investor/dashboard")
        }
      }
    })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Choose your path</CardTitle>
        <CardDescription>
          Select your role and set up your workspace to get started.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            <FormField
              control={form.control}
              name="workspaceType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="SEARCHER" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Searcher (I want to buy a business)
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="INVESTOR" />
                        </FormControl>
                        <FormLabel className="font-normal">
                          Investor (I want to fund searchers)
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="workspaceName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workspace Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Capital" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="linkedinUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn URL (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://linkedin.com/in/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Provisioning Workspace..." : "Complete Setup"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
