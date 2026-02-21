export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      Company: {
        Row: {
          domain: string
          hashedDomain: string
          id: string
          industry: string | null
          name: string
          workspaceId: string
        }
        Insert: {
          domain: string
          hashedDomain: string
          id?: string
          industry?: string | null
          name: string
          workspaceId: string
        }
        Update: {
          domain?: string
          hashedDomain?: string
          id?: string
          industry?: string | null
          name?: string
          workspaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Company_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "Workspace"
            referencedColumns: ["id"]
          }
        ]
      }
      Deal: {
        Row: {
          companyId: string
          createdAt: string
          id: string
          stage: Database["public"]["Enums"]["DealStage"]
          status: Database["public"]["Enums"]["DealStatus"]
          visibilityTier: Database["public"]["Enums"]["VisibilityTier"]
          workspaceId: string
        }
        Insert: {
          companyId: string
          createdAt?: string
          id?: string
          stage?: Database["public"]["Enums"]["DealStage"]
          status?: Database["public"]["Enums"]["DealStatus"]
          visibilityTier?: Database["public"]["Enums"]["VisibilityTier"]
          workspaceId: string
        }
        Update: {
          companyId?: string
          createdAt?: string
          id?: string
          stage?: Database["public"]["Enums"]["DealStage"]
          status?: Database["public"]["Enums"]["DealStatus"]
          visibilityTier?: Database["public"]["Enums"]["VisibilityTier"]
          workspaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Deal_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "Company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Deal_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "Workspace"
            referencedColumns: ["id"]
          }
        ]
      }
      SourcingTarget: {
        Row: {
          domain: string
          estimatedMargins: number | null
          estimatedRevenue: number | null
          fitScore: number
          id: string
          industry: string | null
          name: string
          scoreMetadata: Json | null
          status: Database["public"]["Enums"]["SourcingStatus"]
          workspaceId: string
        }
        Insert: {
          domain: string
          estimatedMargins?: number | null
          estimatedRevenue?: number | null
          fitScore?: number
          id?: string
          industry?: string | null
          name: string
          scoreMetadata?: Json | null
          status?: Database["public"]["Enums"]["SourcingStatus"]
          workspaceId: string
        }
        Update: {
          domain?: string
          estimatedMargins?: number | null
          estimatedRevenue?: number | null
          fitScore?: number
          id?: string
          industry?: string | null
          name?: string
          scoreMetadata?: Json | null
          status?: Database["public"]["Enums"]["SourcingStatus"]
          workspaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "SourcingTarget_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "Workspace"
            referencedColumns: ["id"]
          }
        ]
      }
      User: {
        Row: {
          email: string
          emailNotifications: boolean
          firstName: string
          id: string
          lastName: string
          linkedinUrl: string | null
          role: Database["public"]["Enums"]["Role"]
          workspaceId: string
        }
        Insert: {
          email: string
          emailNotifications?: boolean
          firstName: string
          id?: string
          lastName: string
          linkedinUrl?: string | null
          role: Database["public"]["Enums"]["Role"]
          workspaceId: string
        }
        Update: {
          email?: string
          emailNotifications?: boolean
          firstName?: string
          id?: string
          lastName?: string
          linkedinUrl?: string | null
          role?: Database["public"]["Enums"]["Role"]
          workspaceId?: string
        }
        Relationships: [
          {
            foreignKeyName: "User_workspaceId_fkey"
            columns: ["workspaceId"]
            isOneToOne: false
            referencedRelation: "Workspace"
            referencedColumns: ["id"]
          }
        ]
      }
      Workspace: {
        Row: {
          createdAt: string
          deletedAt: string | null
          id: string
          name: string
          stripeCustomerId: string | null
          subscriptionPlan: Database["public"]["Enums"]["SubscriptionPlan"]
          workspaceType: Database["public"]["Enums"]["WorkspaceType"]
        }
        Insert: {
          createdAt?: string
          deletedAt?: string | null
          id?: string
          name: string
          stripeCustomerId?: string | null
          subscriptionPlan?: Database["public"]["Enums"]["SubscriptionPlan"]
          workspaceType: Database["public"]["Enums"]["WorkspaceType"]
        }
        Update: {
          createdAt?: string
          deletedAt?: string | null
          id?: string
          name?: string
          stripeCustomerId?: string | null
          subscriptionPlan?: Database["public"]["Enums"]["SubscriptionPlan"]
          workspaceType?: Database["public"]["Enums"]["WorkspaceType"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_auth_workspace_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      DealStage: "INBOX" | "NDA_SIGNED" | "CIM_REVIEW" | "LOI_ISSUED" | "DUE_DILIGENCE" | "CLOSED_WON"
      DealStatus: "ACTIVE" | "ARCHIVED" | "LOST"
      Role: "ADMIN" | "ANALYST"
      SourcingStatus: "UNTOUCHED" | "IN_SEQUENCE" | "REPLIED" | "ARCHIVED" | "CONVERTED"
      SubscriptionPlan: "FREE" | "SEARCHER_PRO" | "INVESTOR_PREMIUM"
      VisibilityTier: "TIER_1_PRIVATE" | "TIER_2_SHARED"
      WorkspaceType: "SEARCHER" | "INVESTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
