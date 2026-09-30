import stateRecords from "./states.json";

export type StateMetadata = {
  id: string;
  name: string;
  code: string;
  slug: string;
};

export const states = stateRecords satisfies StateMetadata[];

export function getStateBySlug(slug: string) {
  return states.find((state) => state.slug === slug);
}
