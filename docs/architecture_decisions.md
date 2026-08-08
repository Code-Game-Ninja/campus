# Architecture Decisions

## 1. Separation of Mobile Event Access and Organizer Tools (Date: August 2026)

**Decision:** 
The CampusSphere mobile app will keep the student-facing event experience: event discovery, search/filtering, event details, saving or registering for events, and event reminders. Mobile users cannot create, edit, publish, cancel, or manage events and cannot access organizer roles, professional access, attendee management, analytics, or organizer dashboards.

All event authoring and organizer operations will be available only through a dedicated desktop-first web portal. Team Finder remains a separate student feature and must not depend on event teams or organizer permissions.

**Reasoning:**
- The main student application should remain focused on the everyday attendee experience, including discovering and following campus events.
- Organizers, campus administrators, and club leaders require a much more complex and secure toolset (managing applications, reviewing analytics, sending invitations, accessing professional settings).
- Moving these features to a dedicated **Admin/Organizer Portal** allows us to build powerful desktop-first features for organizers without cluttering the mobile-first prototype application.
- A strict backend authorization boundary prevents a mobile student session from reaching organizer write or dashboard operations even if a hidden route is called directly.

**Next Steps:**
- Remove the `organizer` routes, professional-access UI, organizer roles, and event-creation/management UI from the `prototype` frontend.
- Preserve and complete the student event discovery, detail, save/register, and reminder flows.
- Build a separate admin application (or dashboard) where authorized organizers create and manage events.
