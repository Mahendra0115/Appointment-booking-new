# Postman Files

## Files

- `appointment-booking.postman_collection.json`
- `appointment-booking.local.postman_environment.json`

Base URL used by these files:

- `http://localhost:3000/api/v1`

## Import In Postman

1. Open Postman.
2. Click `Import`.
3. Select both JSON files from this folder.
4. Click `Import`.
5. Open the imported environment named `Appointment Booking Local`.
6. Select that environment in the top-right of Postman.

## Run Order

1. `1. Health Check`
2. `2. Doctor Signup`
3. `3. Doctor Login`
4. `4. Create Doctor Profile`
5. `5. Get My Doctor Profile`
6. `6. Update My Doctor Profile`
7. `7. Patient Signup`
8. `8. Patient Login`
9. `9. Get All Doctors`
10. `10. Get Doctor By ID`
11. `11. Check Availability`
12. `12. Book Appointment`
13. `13. Book Same Slot Again - Error Case`
14. `14. Get My Appointments`
15. `15. Get Appointment By ID`

## Notes

- `doctorToken` is auto-saved after `3. Doctor Login`.
- `patientToken` is auto-saved after `8. Patient Login`.
- `doctorId` is auto-saved after `4. Create Doctor Profile`.
- `appointmentId` is auto-saved after `12. Book Appointment`.
- Change `baseUrl` in the environment if your API runs on a different host or port.
