package com.patrolmanager.app.data.remote

import retrofit2.http.*

interface PatrolApi {
    @GET("patrols/active")
    suspend fun getActivePatrol(): ApiResponse<PatrolRunDto>

    @POST("patrols/{id}/start")
    suspend fun startPatrol(@Path("id") id: Int, @Body location: LocationDto): ApiResponse<PatrolRunDto>

    @POST("patrols/{id}/verify")
    suspend fun verifyCheckpoint(@Path("id") id: Int, @Body verificationData: VerificationDto): ApiResponse<VerificationResultDto>

    @POST("patrols/{id}/complete")
    suspend fun completePatrol(@Path("id") id: Int, @Body location: LocationDto): ApiResponse<PatrolRunDto>
}
