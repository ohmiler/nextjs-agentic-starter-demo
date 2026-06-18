import { getCurrentUser } from "@/lib/auth/session";
import { ProfileForms } from "@/app/components/profile-forms";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  return (
    <ProfileForms fullName={user!.fullName} email={user!.email} />
  );
}
