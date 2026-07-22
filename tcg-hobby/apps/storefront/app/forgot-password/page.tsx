import { Container, PageShell, Section } from '@tcg-hobby/ui';
import { SiteHeader } from '../../components/site-header';
import { ForgotPasswordForm } from '../../components/password-recovery-forms';
export const metadata={title:'Reset password | TCG Hobby'};
export default function ForgotPasswordPage(){return <PageShell><SiteHeader/><main><Section className="py-16"><Container className="flex justify-center"><ForgotPasswordForm/></Container></Section></main></PageShell>;}
