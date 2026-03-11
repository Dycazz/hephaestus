import { OrgProvider } from '@/context/OrgContext'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <OrgProvider>{children}</OrgProvider>
}
