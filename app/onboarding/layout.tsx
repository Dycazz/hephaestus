import { OrgProvider } from '@/context/OrgContext'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <OrgProvider>{children}</OrgProvider>
}
