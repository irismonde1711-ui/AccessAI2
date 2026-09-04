-- Pro plan is actually a $29 AUD one-time PayPal payment (confirmed against
-- the live hosted button), not the $17 originally assumed in the spec.
alter table subscriptions alter column amount set default 29.00;
