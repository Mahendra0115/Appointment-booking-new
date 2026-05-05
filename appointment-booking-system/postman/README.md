# Appointment Booking Postman Guide

## Files

- `appointment-booking.postman_collection.json`
- `appointment-booking-new.json`
- `appointment-booking.local.postman_environment.json`

Base URL:

```text
http://localhost:3000/api/v1
```

## Import In Postman

1. Open Postman.
2. Click `Import`.
3. Import `appointment-booking.postman_collection.json` and `appointment-booking.local.postman_environment.json`.
4. Select environment `Appointment Booking Local`.
5. Run APIs step by step in the order below.

## Important Variables

Postman auto-saves:

- `doctorToken` after doctor login
- `patientToken` after patient login
- `doctorId` after doctor profile creation
- `appointmentId` after appointment booking

You can manually change:

- `nextAvailableFromDate`
- `slotCheckDate`
- `preferredAppointmentDate`
- `preferredSlotStartTime`
- `daysToSearch`

## API Test Steps

### 1. Health Check

Checks if API is running.

```http
GET {{baseUrl}}/health
```

Expected output:

```json
{
  "success": true,
  "message": "Appointment Booking API is live"
}
```

### 2. Doctor Signup

Creates a doctor user account.

```http
POST {{baseUrl}}/auth/signup
```

Body:

```json
{
  "fullName": "Dr. Meera Sharma",
  "email": "doctor@example.com",
  "password": "doctor123",
  "role": "DOCTOR"
}
```

Expected output:

```json
{
  "success": true,
  "message": "Signup successful",
  "data": {
    "accessToken": "jwt-token",
    "user": {
      "id": "doctor-user-id",
      "fullName": "Dr. Meera Sharma",
      "email": "doctor@example.com",
      "role": "DOCTOR"
    }
  }
}
```

### 3. Doctor Login

Logs in doctor and saves `doctorToken`.

```http
POST {{baseUrl}}/auth/login
```

Body:

```json
{
  "email": "doctor@example.com",
  "password": "doctor123"
}
```

Expected output:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "jwt-token",
    "user": {
      "id": "doctor-user-id",
      "email": "doctor@example.com",
      "role": "DOCTOR"
    }
  }
}
```

### 4. Create Doctor Profile

Creates doctor schedule/configuration and saves `doctorId`.

```http
POST {{baseUrl}}/doctors
Authorization: Bearer {{doctorToken}}
```

Body:

```json
{
  "doctorName": "Dr. Meera Sharma",
  "specialization": "Cardiology",
  "availableDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
  "weeklyOffDays": ["SUNDAY"],
  "consultingStartTime": "09:00",
  "consultingEndTime": "17:00",
  "slotDurationMinutes": 15,
  "nextAvailableSearchDays": 7
}
```

Expected output:

```json
{
  "success": true,
  "message": "Doctor created successfully",
  "data": {
    "id": "doctor-id",
    "doctorName": "Dr. Meera Sharma",
    "specialization": "Cardiology",
    "availableDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
    "weeklyOffDays": ["SUNDAY"],
    "consultingStartTime": "09:00:00",
    "consultingEndTime": "17:00:00",
    "slotDurationMinutes": 15,
    "totalAppointmentsPerDay": null,
    "autoCalculatedTotalSlots": 32,
    "totalSlotsPerDay": 32,
    "nextAvailableSearchDays": 7
  }
}
```

### 5. Get My Doctor Profile

Fetches logged-in doctor's profile.

```http
GET {{baseUrl}}/doctors/me
Authorization: Bearer {{doctorToken}}
```

Expected output:

```json
{
  "success": true,
  "message": "Doctor profile fetched successfully",
  "data": {
    "id": "doctor-id",
    "doctorName": "Dr. Meera Sharma",
    "specialization": "Cardiology",
    "totalSlotsPerDay": 32
  }
}
```

### 6. Update My Doctor Profile

Updates doctor schedule/configuration.

```http
PATCH {{baseUrl}}/doctors/me
Authorization: Bearer {{doctorToken}}
```

Body:

```json
{
  "specialization": "Senior Cardiology Consultant",
  "totalAppointmentsPerDay": 20,
  "nextAvailableSearchDays": 10
}
```

Expected output:

```json
{
  "success": true,
  "message": "Doctor updated successfully",
  "data": {
    "id": "doctor-id",
    "specialization": "Senior Cardiology Consultant",
    "totalAppointmentsPerDay": 20,
    "totalSlotsPerDay": 20,
    "nextAvailableSearchDays": 10
  }
}
```

### 7. Doctor Leave - Full Day

Marks doctor unavailable for a full day.

```http
POST {{baseUrl}}/doctor-leaves
Authorization: Bearer {{doctorToken}}
```

Body:

```json
{
  "startDate": "2026-04-24",
  "endDate": "2026-04-24",
  "isFullDay": true,
  "reason": "Doctor conference"
}
```

Expected output:

```json
{
  "success": true,
  "message": "Doctor leave created successfully",
  "data": {
    "id": "leave-id",
    "doctorId": "doctor-id",
    "startDate": "2026-04-24",
    "endDate": "2026-04-24",
    "isFullDay": true,
    "startTime": null,
    "endTime": null,
    "reason": "Doctor conference"
  }
}
```

### 8. Doctor Leave - Partial Day

Blocks doctor slots inside a time range.

```http
POST {{baseUrl}}/doctor-leaves
Authorization: Bearer {{doctorToken}}
```

Body:

```json
{
  "startDate": "2026-04-25",
  "endDate": "2026-04-25",
  "isFullDay": false,
  "startTime": "13:00",
  "endTime": "15:00",
  "reason": "Personal work"
}
```

Expected output:

```json
{
  "success": true,
  "message": "Doctor leave created successfully",
  "data": {
    "id": "leave-id",
    "doctorId": "doctor-id",
    "startDate": "2026-04-25",
    "endDate": "2026-04-25",
    "isFullDay": false,
    "startTime": "13:00:00",
    "endTime": "15:00:00",
    "reason": "Personal work"
  }
}
```

### 9. Clinic Closure - Full Day

Marks clinic closed for a full day.

```http
POST {{baseUrl}}/clinic-closures
Authorization: Bearer {{doctorToken}}
```

Body:

```json
{
  "startDate": "2026-04-26",
  "endDate": "2026-04-26",
  "isFullDay": true,
  "reason": "Clinic holiday"
}
```

Expected output:

```json
{
  "success": true,
  "message": "Clinic closure created successfully",
  "data": {
    "id": "closure-id",
    "startDate": "2026-04-26",
    "endDate": "2026-04-26",
    "isFullDay": true,
    "startTime": null,
    "endTime": null,
    "reason": "Clinic holiday"
  }
}
```

### 10. Clinic Closure - Partial Day

Blocks clinic slots inside a time range.

```http
POST {{baseUrl}}/clinic-closures
Authorization: Bearer {{doctorToken}}
```

Body:

```json
{
  "startDate": "2026-04-27",
  "endDate": "2026-04-27",
  "isFullDay": false,
  "startTime": "12:00",
  "endTime": "14:00",
  "reason": "Emergency maintenance"
}
```

Expected output:

```json
{
  "success": true,
  "message": "Clinic closure created successfully",
  "data": {
    "id": "closure-id",
    "startDate": "2026-04-27",
    "endDate": "2026-04-27",
    "isFullDay": false,
    "startTime": "12:00:00",
    "endTime": "14:00:00",
    "reason": "Emergency maintenance"
  }
}
```

### 11. Patient Signup

Creates a patient user account.

```http
POST {{baseUrl}}/auth/signup
```

Body:

```json
{
  "fullName": "Rahul Verma",
  "email": "patient@example.com",
  "password": "patient123",
  "role": "PATIENT"
}
```

Expected output:

```json
{
  "success": true,
  "message": "Signup successful",
  "data": {
    "accessToken": "jwt-token",
    "user": {
      "id": "patient-user-id",
      "fullName": "Rahul Verma",
      "email": "patient@example.com",
      "role": "PATIENT"
    }
  }
}
```

### 12. Patient Login

Logs in patient and saves `patientToken`.

```http
POST {{baseUrl}}/auth/login
```

Body:

```json
{
  "email": "patient@example.com",
  "password": "patient123"
}
```

Expected output:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "jwt-token",
    "user": {
      "id": "patient-user-id",
      "email": "patient@example.com",
      "role": "PATIENT"
    }
  }
}
```

### 13. Get Next Available Day

Checks next available date and first available slot from selected date.

```http
GET {{baseUrl}}/doctor/{{doctorId}}/next-available?from={{nextAvailableFromDate}}&daysToSearch={{daysToSearch}}
Authorization: Bearer {{patientToken}}
```

Expected output:

```json
{
  "success": true,
  "message": "Next available appointment fetched successfully",
  "data": {
    "doctor": {
      "id": "doctor-id",
      "doctorName": "Dr. Meera Sharma"
    },
    "fromDate": "2026-04-23",
    "nextAvailableDate": "2026-04-23",
    "nextAvailableSlot": {
      "startTime": "09:00",
      "endTime": "09:15"
    },
    "searchedDays": 1,
    "message": "Appointments are available on 2026-04-23."
  }
}
```

If selected date is blocked:

```json
{
  "success": true,
  "message": "Next available appointment fetched successfully",
  "data": {
    "fromDate": "2026-04-24",
    "nextAvailableDate": "2026-04-28",
    "nextAvailableSlot": {
      "startTime": "09:00",
      "endTime": "09:15"
    },
    "searchedDays": 5,
    "message": "Doctor is unavailable on selected date. Next available slot is on 2026-04-28 at 09:00."
  }
}
```

### 14. Get Available Slots

Returns available slots for a date after checking leave, closure, booking status, and working day.

```http
GET {{baseUrl}}/doctor/{{doctorId}}/slots?date={{slotCheckDate}}
Authorization: Bearer {{patientToken}}
```

Expected output:

```json
{
  "success": true,
  "message": "Doctor slots fetched successfully",
  "data": {
    "doctor": {
      "id": "doctor-id",
      "doctorName": "Dr. Meera Sharma"
    },
    "date": "2026-04-23",
    "isWorkingDay": true,
    "totalSlots": 20,
    "bookedSlots": 0,
    "availableSlots": 20,
    "unavailableReason": null,
    "message": null,
    "slots": [
      {
        "startTime": "09:00",
        "endTime": "09:15"
      },
      {
        "startTime": "09:15",
        "endTime": "09:30"
      }
    ]
  }
}
```

If date is blocked:

```json
{
  "success": true,
  "message": "Doctor slots fetched successfully",
  "data": {
    "date": "2026-04-24",
    "isWorkingDay": true,
    "totalSlots": 0,
    "bookedSlots": 0,
    "availableSlots": 0,
    "unavailableReason": "DOCTOR_ON_LEAVE",
    "message": "Doctor is unavailable on selected date.",
    "slots": []
  }
}
```

### 15. Get All Doctors

Fetches all doctor profiles.

```http
GET {{baseUrl}}/doctors
Authorization: Bearer {{patientToken}}
```

Expected output:

```json
{
  "success": true,
  "message": "Doctors fetched successfully",
  "data": [
    {
      "id": "doctor-id",
      "doctorName": "Dr. Meera Sharma",
      "specialization": "Senior Cardiology Consultant",
      "totalSlotsPerDay": 20
    }
  ]
}
```

### 16. Get Doctor By ID

Fetches one doctor profile.

```http
GET {{baseUrl}}/doctors/{{doctorId}}
Authorization: Bearer {{patientToken}}
```

Expected output:

```json
{
  "success": true,
  "message": "Doctor fetched successfully",
  "data": {
    "id": "doctor-id",
    "doctorName": "Dr. Meera Sharma",
    "specialization": "Senior Cardiology Consultant",
    "availableDays": ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"],
    "weeklyOffDays": ["SUNDAY"],
    "consultingStartTime": "09:00:00",
    "consultingEndTime": "17:00:00",
    "slotDurationMinutes": 15,
    "totalSlotsPerDay": 20
  }
}
```

### 17. Check Availability

Returns selected date schedule plus next available suggestion.

```http
GET {{baseUrl}}/doctors/{{doctorId}}/availability?date={{slotCheckDate}}&daysToSearch={{daysToSearch}}
Authorization: Bearer {{patientToken}}
```

Expected output:

```json
{
  "success": true,
  "message": "Doctor availability fetched successfully",
  "data": {
    "requestedDate": "2026-04-23",
    "nextAvailableDate": "2026-04-23",
    "nextAvailableSlot": {
      "startTime": "09:00",
      "endTime": "09:15"
    },
    "searchedDays": 1,
    "message": "Appointments are available on 2026-04-23.",
    "schedule": {
      "date": "2026-04-23",
      "isWorkingDay": true,
      "totalSlots": 20,
      "bookedSlots": 0,
      "availableSlots": 20,
      "slots": [
        {
          "startTime": "09:00",
          "endTime": "09:15"
        }
      ]
    }
  }
}
```

### 18. Book Appointment

Books appointment only for selected date and selected slot. Auto booking is not allowed.

```http
POST {{baseUrl}}/appointments
Authorization: Bearer {{patientToken}}
```

Body:

```json
{
  "doctorId": "{{doctorId}}",
  "patientPhoneNumber": "9876543210",
  "patientName": "Rahul Verma",
  "reasonForVisit": "Chest pain follow-up",
  "appointmentDate": "{{preferredAppointmentDate}}",
  "slotStartTime": "{{preferredSlotStartTime}}"
}
```

Expected output:

```json
{
  "success": true,
  "message": "Appointment booked successfully",
  "data": {
    "id": "appointment-id",
    "doctorId": "doctor-id",
    "doctorName": "Dr. Meera Sharma",
    "patientUserId": "patient-user-id",
    "patientPhoneNumber": "9876543210",
    "patientName": "Rahul Verma",
    "reasonForVisit": "Chest pain follow-up",
    "appointmentDate": "2026-04-23",
    "slotStartTime": "09:15",
    "slotEndTime": "09:30",
    "tokenNumber": 1,
    "reportingTime": "09:15",
    "status": "BOOKED"
  }
}
```

If `slotStartTime` is missing:

```json
{
  "success": false,
  "message": "slotStartTime is required. Please select an available slot before booking.",
  "reason": "SLOT_REQUIRED"
}
```

### 19. Book Same Slot Again - Error Case

Tests duplicate slot booking. This should not create a booking.

```http
POST {{baseUrl}}/appointments
Authorization: Bearer {{patientToken}}
```

Body:

```json
{
  "doctorId": "{{doctorId}}",
  "patientPhoneNumber": "9988776655",
  "patientName": "Aman Singh",
  "reasonForVisit": "Consultation",
  "appointmentDate": "{{preferredAppointmentDate}}",
  "slotStartTime": "{{preferredSlotStartTime}}"
}
```

Expected output:

```json
{
  "statusCode": 400,
  "message": "This slot is already booked.",
  "reason": "SLOT_NOT_AVAILABLE",
  "nextavailableDays": "Thursday",
  "nextAvailableDate": "2026-04-23",
  "nextAvailableSlot": {
    "startTime": "09:30",
    "endTime": "09:45"
  },
  "tokenNo": 2
}
```

### 20. Get My Appointments

Lists logged-in patient's appointments.

```http
GET {{baseUrl}}/appointments?doctorId={{doctorId}}&appointmentDate={{preferredAppointmentDate}}
Authorization: Bearer {{patientToken}}
```

Expected output:

```json
{
  "success": true,
  "message": "Appointments fetched successfully",
  "data": [
    {
      "id": "appointment-id",
      "doctorId": "doctor-id",
      "doctorName": "Dr. Meera Sharma",
      "patientUserId": "patient-user-id",
      "patientPhoneNumber": "9876543210",
      "appointmentDate": "2026-04-23",
      "slotStartTime": "09:15",
      "slotEndTime": "09:30",
      "tokenNumber": 1,
      "reportingTime": "09:15",
      "status": "BOOKED"
    }
  ]
}
```

### 21. Get Appointment By ID

Fetches one appointment for logged-in patient.

```http
GET {{baseUrl}}/appointments/{{appointmentId}}
Authorization: Bearer {{patientToken}}
```

Expected output:

```json
{
  "success": true,
  "message": "Appointment fetched successfully",
  "data": {
    "id": "appointment-id",
    "doctorId": "doctor-id",
    "doctorName": "Dr. Meera Sharma",
    "patientUserId": "patient-user-id",
    "patientPhoneNumber": "9876543210",
    "patientName": "Rahul Verma",
    "reasonForVisit": "Chest pain follow-up",
    "appointmentDate": "2026-04-23",
    "slotStartTime": "09:15",
    "slotEndTime": "09:30",
    "tokenNumber": 1,
    "reportingTime": "09:15",
    "status": "BOOKED"
  }
}
```

### 22. Confirm Appointment

Confirms a booked appointment by the logged-in patient.

```http
PATCH {{baseUrl}}/appointments/{{appointmentId}}/confirm
Authorization: Bearer {{patientToken}}
```

Expected output:

```json
{
  "success": true,
  "message": "Appointment confirmed successfully",
  "data": {
    "id": "appointment-id",
    "status": "CONFIRMED"
  }
}
```
