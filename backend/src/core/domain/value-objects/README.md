# Value Objects

## Purpose
Immutable value objects that represent domain concepts without identity.

## Value Object Types

### GeofenceBoundary
Represents a GPS polygon defining site boundaries.

**Properties**:
- `coordinates`: Array of [lat, lng] pairs
- `radius`: Optional circular radius (for circular geofences)

**Business Rules**:
- Must have at least 3 coordinates for polygon
- Must form a valid closed polygon
- Coordinates must be valid GPS coordinates

### GPSLocation
Represents a GPS coordinate with accuracy.

**Properties**:
- `latitude`: Number between -90 and 90
- `longitude`: Number between -180 and 180
- `accuracy`: Accuracy in meters
- `timestamp`: When the location was recorded

**Business Rules**:
- Valid latitude/longitude ranges
- Accuracy cannot be negative
- Calculate distance to another location
- Check if within geofence boundary

### PhoneNumber
Represents a validated phone number.

**Properties**:
- `countryCode`: ISO country code
- `number`: Local phone number
- `formatted`: Full formatted number

**Business Rules**:
- Validate format for country
- E.164 formatting
- Can send SMS verification

### Email
Represents a validated email address.

**Properties**:
- `localPart`: Part before @
- `domain`: Part after @
- `full`: Full email address

**Business Rules**:
- Must contain exactly one @
- Domain must have at least one dot
- Case-insensitive comparison
- Validate MX record (optional)

### Money
Represents a monetary amount with currency.

**Properties**:
- `amount`: Decimal amount
- `currency`: ISO 4217 currency code

**Business Rules**:
- Amount cannot be negative (use separate field for refunds)
- Currency must be valid ISO code
- Precision handling (2 decimal places for most currencies)
- Arithmetic operations with currency checking

### TimeInterval
Represents a time range.

**Properties**:
- `startDate`: Start of interval
- `endDate`: End of interval
- `duration`: Calculated duration

**Business Rules**:
- End date must be after start date
- Calculate overlap with another interval
- Check if a date/time falls within interval

## TODO

- [ ] Implement GeofenceBoundary value object
- [ ] Implement GPSLocation value object
- [ ] Implement PhoneNumber value object
- [ ] Implement Email value object
- [ ] Implement Money value object
- [ ] Implement TimeInterval value object
