export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Enums: {
      broker_account_kind: "live" | "demo";
      license_check_result:
        | "allowed"
        | "denied_unknown_account"
        | "denied_pending"
        | "denied_rejected"
        | "denied_suspended"
        | "denied_revoked"
        | "denied_expired"
        | "denied_platform_mismatch"
        | "denied_invalid_token"
        | "grace_allowed"
        | "server_error";
      license_kind: "live" | "demo";
      license_status: "active" | "inactive" | "expired" | "suspended" | "revoked";
      platform_type: "MT4" | "MT5";
      support_ticket_category:
        | "license_verification"
        | "mt4_mt5_setup"
        | "broker_ib_issue"
        | "performance_trading_query"
        | "other";
      support_ticket_status: "open" | "waiting_on_user" | "resolved" | "closed";
      user_role: "user" | "admin";
      verification_status: "pending" | "verified" | "rejected" | "suspended" | "revoked" | "removed_by_user";
    };
    Tables: {
      admin_audit_logs: {
        Row: {
          id: string;
          admin_id: string | null;
          action: string;
          target_table: string | null;
          target_id: string | null;
          previous_data: Json | null;
          new_data: Json | null;
          created_at: string;
        };
      };
      brokers: {
        Row: {
          id: string;
          name: string;
          slug: string;
          is_active: boolean;
          launch_partner_code: string | null;
          registration_url: string | null;
          created_at: string;
        };
      };
      broker_accounts: {
        Row: {
          id: string;
          user_id: string;
          broker_id: string;
          account_number: string;
          platform: Database["public"]["Enums"]["platform_type"];
          account_kind: Database["public"]["Enums"]["broker_account_kind"];
          account_type_label: string | null;
          verification_status: Database["public"]["Enums"]["verification_status"];
          verification_method: string;
          rejection_reason: string | null;
          admin_notes: string | null;
          submitted_at: string;
          verified_at: string | null;
          rejected_at: string | null;
          removed_at: string | null;
          verified_by: string | null;
          updated_at: string;
        };
      };
      demo_licenses: {
        Row: {
          id: string;
          user_id: string;
          platform: Database["public"]["Enums"]["platform_type"];
          license_token_hash: string;
          status: Database["public"]["Enums"]["license_status"];
          starts_at: string;
          expires_at: string;
          created_at: string;
          revoked_at: string | null;
        };
      };
      license_entitlements: {
        Row: {
          id: string;
          user_id: string;
          broker_account_id: string | null;
          demo_license_id: string | null;
          kind: Database["public"]["Enums"]["license_kind"];
          platform: Database["public"]["Enums"]["platform_type"];
          ea_product: string;
          ea_version: string | null;
          status: Database["public"]["Enums"]["license_status"];
          license_token_hash: string;
          starts_at: string;
          expires_at: string | null;
          last_validated_at: string | null;
          created_at: string;
          revoked_at: string | null;
        };
      };
      license_checks: {
        Row: {
          id: string;
          user_id: string | null;
          broker_account_id: string | null;
          demo_license_id: string | null;
          license_entitlement_id: string | null;
          account_number: string | null;
          account_kind: Database["public"]["Enums"]["broker_account_kind"] | null;
          platform: Database["public"]["Enums"]["platform_type"] | null;
          broker_name: string | null;
          ea_product: string | null;
          ea_version: string | null;
          result: Database["public"]["Enums"]["license_check_result"];
          message: string | null;
          request_ip: string | null;
          user_agent: string | null;
          checked_at: string;
        };
      };
      support_tickets: {
        Row: {
          id: string;
          user_id: string;
          category: Database["public"]["Enums"]["support_ticket_category"];
          broker_id: string | null;
          broker_account_id: string | null;
          platform: Database["public"]["Enums"]["platform_type"] | null;
          account_kind: Database["public"]["Enums"]["broker_account_kind"] | null;
          account_number: string | null;
          error_code: string | null;
          subject: string;
          description: string;
          status: Database["public"]["Enums"]["support_ticket_status"];
          created_at: string;
          updated_at: string;
          closed_at: string | null;
        };
      };
      [_: string]: {
        Row: Record<string, unknown>;
      };
    };
  };
};
