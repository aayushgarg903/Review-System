alter table analytics_events drop constraint if exists analytics_events_event_type_check;

update analytics_events set event_type='landing_page_view' where event_type='qr_scan';

alter table analytics_events add constraint analytics_events_event_type_check check (event_type in ('landing_page_view','google_click','private_form_open','private_message_sent'));
