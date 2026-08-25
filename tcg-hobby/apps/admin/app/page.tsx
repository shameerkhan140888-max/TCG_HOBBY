import { redirect } from 'next/navigation';

export default function AdminRootPage() {
  const rootPath = process.env.ADMIN_ROOT_REDIRECT_PATH?.trim();
  redirect(rootPath?.startsWith('/') && !rootPath.startsWith('//') ? rootPath : '/admin');
}
