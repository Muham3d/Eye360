# PatrolManager Mobile (Android)

## Architecture
- **Clean Architecture**: Domain, Data, Presentation layers.
- **MVVM**: Model-View-ViewModel.
- **Jetpack Compose**: Modern declarative UI.
- **Hilt**: Dependency Injection.
- **Retrofit**: Networking.
- **Room**: Local Database.

## Package Structure
- `com.patrolmanager.app.core`: Base classes, utils, constants.
- `com.patrolmanager.app.di`: Hilt modules.
- `com.patrolmanager.app.domain`: Entities, Use Cases, Repository Interfaces.
- `com.patrolmanager.app.data`: Repository Implementations, DAOs, API Services.
- `com.patrolmanager.app.presentation`: UI components, ViewModels, Screens.

## Status
- Foundation scaffolded.
- Architecture defined.
- Hilt & Retrofit configured (scaffolded).
- Room DB entities defined (scaffolded).
