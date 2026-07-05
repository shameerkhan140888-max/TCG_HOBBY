import { getNotificationCenterPreferences } from '@tcg-hobby/database';
import { Button, Card, CardContent, Container, EmptyState, Section, StatusBadge, NotificationPreference } from '@tcg-hobby/ui';
import { AnnouncementBanner } from '@tcg-hobby/ui';
import { requireCustomerSession } from '../../../lib/auth';
import { getCurrentCustomerNotifications, toggleNotificationAction, updateNotificationPreferenceAction } from '../../../lib/release-actions';
import { updateNotificationCenterAction } from '../../../lib/market-actions';

export default async function AccountNotificationsPage() {
  const session = await requireCustomerSession('/account/notifications');
  const [notifications, preferences] = await Promise.all([
    getCurrentCustomerNotifications(),
    getNotificationCenterPreferences(session.user.id),
  ]);

  return (
    <Section className="py-8">
      <Container className="space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">Notifications</p>
          <h1 className="text-3xl font-black sm:text-4xl">Release interest and notification preferences.</h1>
          <p className="max-w-3xl text-sm leading-6 text-neutral-400">
            We are storing customer interest for future notifications only. No emails are sent yet, but this keeps the architecture ready for upcoming release and market alerts.
          </p>
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

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Notification centre</p>
            <h2 className="mt-2 text-2xl font-bold">General preference settings</h2>
          </div>

          {preferences.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {preferences.map((preference) => (
                <Card key={preference.id}>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <NotificationPreference
                        notificationType={preference.notificationType}
                        emailEnabled={preference.emailEnabled}
                        pushEnabled={preference.pushEnabled}
                        inAppEnabled={preference.inAppEnabled}
                      />
                      {preference.subjectType ? <StatusBadge tone="neutral">{preference.subjectType}</StatusBadge> : null}
                    </div>
                    <p className="text-sm text-neutral-400">{preference.subjectLabel ?? 'General preference'}</p>
                    <form action={updateNotificationCenterAction} className="grid gap-3 sm:grid-cols-2">
                      <input type="hidden" name="notificationType" value={preference.notificationType} />
                      <input type="hidden" name="subjectType" value={preference.subjectType ?? ''} />
                      <input type="hidden" name="subjectLabel" value={preference.subjectLabel ?? preference.notificationType} />
                      <input type="hidden" name="returnTo" value="/account/notifications" />
                      <label className="flex items-center gap-2 text-sm text-neutral-300">
                        <input type="checkbox" name="emailEnabled" defaultChecked={preference.emailEnabled} />
                        Email
                      </label>
                      <label className="flex items-center gap-2 text-sm text-neutral-300">
                        <input type="checkbox" name="pushEnabled" defaultChecked={preference.pushEnabled} />
                        Push
                      </label>
                      <label className="flex items-center gap-2 text-sm text-neutral-300">
                        <input type="checkbox" name="inAppEnabled" defaultChecked={preference.inAppEnabled} />
                        In-app
                      </label>
                      <div className="flex items-end justify-end">
                        <Button type="submit" variant="outline">
                          Save
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No notification preferences yet" description="Preference rows will appear here once the account starts storing future alerts." />
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent">Release interest</p>
            <h2 className="mt-2 text-2xl font-bold">Products you asked to follow</h2>
          </div>

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
        </div>
      </Container>
    </Section>
  );
}
