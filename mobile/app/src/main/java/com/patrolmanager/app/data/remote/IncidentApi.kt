package com.patrolmanager.app.data.remote

import okhttp3.MultipartBody
import retrofit2.http.*

interface IncidentApi {
    @GET("incidents")
    suspend fun getIncidents(): ApiResponse<List<IncidentDto>>

    @POST("incidents")
    suspend fun reportIncident(@Body data: CreateIncidentDto): ApiResponse<IncidentDto>

    @Multipart
    @POST("incidents/{id}/evidence")
    suspend fun uploadEvidence(
        @Path("id") id: Int,
        @Part file: MultipartBody.Part
    ): ApiResponse<EvidenceDto>

    @POST("incidents/{id}/comments")
    suspend fun addComment(@Path("id") id: Int, @Body comment: CommentDto): ApiResponse<CommentDto>
}
