import type { ClientContact } from "./ClientContact";
import type { TaggedProject } from "./TaggedProject";

export interface ClientData {
  _id: string;
  name: string;
  phone?: string;
  emails: string[];
  address?: string;
  duration?: string;
  contacts?: ClientContact[];
  projects: TaggedProject[];
}