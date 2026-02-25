package com.patrolmanager.app.data.remote

import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class RealTimeSocketClient @Inject constructor() {
    private var socket: Socket? = null

    fun connect(token: String) {
        val options = IO.Options.builder()
            .setAuth(mapOf("token" to token))
            .build()

        socket = IO.socket("https://api.patrolmanager.com/guards", options)
        socket?.connect()
    }

    fun sendLocation(lat: Double, lng: Double, accuracy: Float) {
        val data = JSONObject().apply {
            put("latitude", lat)
            put("longitude", lng)
            put("accuracy", accuracy)
            put("timestamp", System.currentTimeMillis())
        }
        socket?.emit("location_update", data)
    }

    fun triggerSOS(lat: Double, lng: Double, message: String?) {
        val data = JSONObject().apply {
            put("latitude", lat)
            put("longitude", lng)
            put("message", message)
        }
        socket?.emit("sos_alert", data)
    }

    // PTT Support
    fun requestPTT(channel: String = "global") {
        val data = JSONObject().apply { put("channel", channel) }
        socket?.emit("ptt_request", data)
    }

    fun releasePTT(channel: String = "global") {
        val data = JSONObject().apply { put("channel", channel) }
        socket?.emit("ptt_release", data)
    }

    fun sendAudioStream(channel: String, audioData: ByteArray) {
        val data = JSONObject().apply {
            put("channel", channel)
            put("audio", audioData)
        }
        socket?.emit("ptt_audio_stream", data)
    }

    fun onPTTGranted(callback: (String) -> Unit) {
        socket?.on("ptt_granted") { args ->
            val data = args[0] as JSONObject
            callback(data.getString("channel"))
        }
    }

    fun onPTTDenied(callback: (String, String) -> Unit) {
        socket?.on("ptt_denied") { args ->
            val data = args[0] as JSONObject
            callback(data.getString("channel"), data.getString("reason"))
        }
    }

    fun onIncomingAudio(callback: (Int, ByteArray) -> Unit) {
        socket?.on("ptt_audio_stream") { args ->
            val data = args[0] as JSONObject
            callback(data.getInt("userId"), data.get("audio") as ByteArray)
        }
    }

    fun onAlertReceived(callback: (JSONObject) -> Unit) {
        socket?.on("alert_notification") { args ->
            val data = args[0] as JSONObject
            callback(data)
        }
    }

    fun disconnect() {
        socket?.disconnect()
    }
}
