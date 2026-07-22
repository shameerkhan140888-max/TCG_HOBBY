import { Container, PageShell, Section } from '@tcg-hobby/ui';
import { SiteHeader } from '../../components/site-header';
import { ResetPasswordForm } from '../../components/password-recovery-forms';
export const metadata={title:'Choose a new password | TCG Hobby'};
export default async function ResetPasswordPage({searchParams}:{searchParams:Promise<{token?:string}>}){const {token=''}=await searchParams;return <PageShell><SiteHeader/><main><Section className="py-16"><Container className="flex justify-center"><ResetPasswordForm token={token}/></Container></Section></main></PageShell>;}
