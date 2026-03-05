export function entityLinkLabel(type: string): string {
  switch (type) {
    case 'garden': return 'Garden';
    case 'plot': return 'Plot';
    case 'plant_instance': return 'Plant';
    case 'plant_catalog': return 'Catalog Plant';
    default: return type;
  }
}

export function entityLinkPath(type: string, id: string): string | null {
  switch (type) {
    case 'garden': return '/garden';
    case 'plot': return `/garden/plots/${id}`;
    case 'plant_instance': return `/plants/${id}`;
    case 'plant_catalog': return `/catalog/${id}`;
    default: return null;
  }
}
