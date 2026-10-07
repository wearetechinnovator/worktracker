import { redirect } from 'next/navigation';

export default async function SharedTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/user/tasks?taskId=${encodeURIComponent(id)}`);
}
