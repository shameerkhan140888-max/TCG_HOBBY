import { Button, Card, CardContent, Container, EmptyState, Section, StatusBadge } from '@tcg-hobby/ui';
import { AnnouncementBanner } from '@tcg-hobby/ui';
import { getCurrentCustomerNotifications, toggleNotificationAction, updateNotificationPreferenceAction } from '../../../lib/release-actions';

export default async function AccountNotificationsPage() {
  const notifications = await getCurrentCustomerNotifications();

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Notifications</p>
          <h1 className="text-3xl font-black sm:text-4xl">Release interest and preorder reminders</h1>
          <p className="max-w-3xl text-sm leading-6 text-neutral-400">We are storing customer interest for future notifications only. No emails are sent yet, but this keeps the architecture ready.</p>
        </div>

        <AnnouncementBanner
          title="Architecture only"
          message="Notification preferences are stored against your account so future release alerts can be enabled without changing the customer experience."
          action={
            <Button asChild variant="outline">
              <a href="/coming-soon">Browse coming soon</a>
            </Button>
          }
        />

        {notifications.length ? (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card key={notification.id}>
                <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-neutral-50">{notification.productName}</h2>
                      <StatusBadge tone={notification.preference === 'ALL' ? 'accent' : 'neutral'}>{notification.preference}</StatusBadge>
                    </div>
                    <p className="text-sm text-neutral-400">{notification.productSlug}</p>
                    <p className="text-xs text-neutral-500">Saved {new Date(notification.createdAt).toLocaleDateString('en-GB')}</p>
                  </div>

                  <div className="flex flex-wrap items-end gap-3">
                    <form action={updateNotificationPreferenceAction} className="flex flex-wrap items-end gap-3">
                      <input type="hidden" name="productId" value={notification.productId} />
                      <input type="hidden" name="returnTo" value="/account/notifications" />
                      <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wide text-neutral-500" htmlFor={`preference-${notification.id}`}>
                          Preference
                        </label>
                        <select
                          id={`preference-${notification.id}`}
                          name="preference"
                          defaultValue={notification.preference}
                          className="h-10 rounded-md border border-surface-line bg-surface-ink px-3 text-sm text-neutral-50 outline-none focus:border-accent"
                        >
                          <option value="ALL">All updates</option>
                          <option value="PREORDER">Pre-order only</option>
                          <option value="RELEASE">Release day only</option>
                        </select>
                      </div>
                      <Button type="submit" variant="outline">
                        Save
                      </Button>
                    </form>
                    <form action={toggleNotificationAction}>
                      <input type="hidden" name="productId" value={notification.productId} />
                      <input type="hidden" name="preference" value={notification.preference} />
                      <input type="hidden" name="returnTo" value="/account/notifications" />
                      <Button type="submit" variant="secondary">
                        Remove
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No notification preferences yet"
            description="Saved release interest will appear here once you tap Notify me on a coming soon product."
            action={
              <Button asChild>
                <a href="/coming-soon">Explore releases</a>
              </Button>
            }
          />
        )}
      </Container>
    </Section>
  );
}
