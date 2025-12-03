import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to access organization state from auth context
 * 
 * @description
 * Provides access to the current user's organization and helper methods.
 * 
 * @example
 * const { organization, organizationId, isInOrg } = useOrganization();
 * 
 * if (!isInOrg) return <OrgSetup />;
 * 
 * // Use organizationId when creating new records
 * await supabase.from('projects').insert({ name, organization_id: organizationId });
 */
export function useOrganization() {
  const { organization } = useAuth();

  return {
    /** The full organization object */
    organization,
    /** Just the organization ID (convenience) */
    organizationId: organization?.id ?? null,
    /** Whether the user is in an organization */
    isInOrg: !!organization,
    /** The organization name */
    orgName: organization?.name ?? null,
    /** The organization slug */
    orgSlug: organization?.slug ?? null,
    /** The organization domain for auto-join */
    orgDomain: organization?.domain ?? null,
  };
}



