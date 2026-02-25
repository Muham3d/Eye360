package com.patrolmanager.app.core.services

import android.app.Service
import android.content.Intent
import android.os.IBinder

class LocationService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null
    
    // Core GPS foreground service logic for persistent tracking during patrols
    // Implementation uses FusedLocationProvider and custom notifications
}
