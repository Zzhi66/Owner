let loading: Promise<typeof import('../features/details/DomainDetails')> | undefined;

export function loadDomainDetails() {
  return (loading ??= import('../features/details/DomainDetails').catch((error: unknown) => {
    loading = undefined;
    throw error;
  }));
}
