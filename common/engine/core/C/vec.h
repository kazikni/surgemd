#ifndef SMDE_VEC2_H
#define SMDE_VEC2_H

#include <math.h>
#include <stdint.h>

typedef struct {
    float x;
    float y;
} Vec2;

//
// Constructors
//

static inline Vec2 vec2(float x,float y){
    return (Vec2){x,y};
}
static inline Vec2 vec2_zero(){
    return (Vec2){0.0f,0.0f};
}
static inline Vec2 vec2_one(){
    return (Vec2){1.0f,1.0f};
}
static inline Vec2 vec2_half_one(){
    return (Vec2){0.5f,0.5f};
}

//
// Setters
//
static inline void vec2m_set(Vec2* out,float x,float y){
    out->x=x;
    out->y=y;
}
static inline void vec2m_add(Vec2* out,Vec2 a,Vec2 b){
    out->x=a.x+b.x;
    out->y=a.y+b.y;
}
static inline void vec2m_sub(Vec2* out,Vec2 a,Vec2 b){
    out->x=a.x-b.x;
    out->y=a.y-b.y;
}
static inline void vec2m_mul(Vec2* out,Vec2 a,Vec2 b){
    out->x=a.x*b.x;
    out->y=a.y*b.y;
}
static inline void vec2m_div(Vec2* out,Vec2 a,Vec2 b){
    out->x=a.x/b.x;
    out->y=a.y/b.y;
}
static inline void vec2m_scale(Vec2* out,Vec2 a,float s){
    out.x=a.x*s;
    out.y=a.y*s;
}
static inline void vec2m_dscale(Vec2* out,Vec2 a,float s){
    out.x=a.x*s;
    out.y=a.y*s;
}

static inline float vec2_dot(Vec2 a,Vec2 b){
    return a.x*b.x+a.y*b.y;
}
static inline float vec2_cross(Vec2 a,Vec2 b){
    return a.x*b.y-a.y*b.x;
}
static inline float vec2_length_squared(Vec2 a){
    return a.x*a.x+a.y*a.y;
}
static inline float vec2_length(Vec2 a){
    return sqrtf(vec2_length_squared(a));
}

static inline float vec2m_distance_squared(Vec2 a,Vec2 b){
    float dx=a.x-b.x;
    float dy=a.y-b.y;
    return dx*dx+dy*dy;
}
static inline float vec2m_distance(Vec2 a,Vec2 b){
    return sqrtf(vec2_distance_squared(a,b));
}

static inline void vec2_normalize(Vec2* out,Vec2 a){
    float len=vec2_length(a);
    if(len>0.000001f){
        float inv=1.0f/len;
        out->x=a.x*inv;
        out->y=a.y*inv;
    }else{
        out->x=1.0f;
        out->y=0.0f;
    }
}
static inline void vec2m_rotate(Vec2* out,Vec2 a,float radians){
    float c=cosf(radians);
    float s=sinf(radians);
    out->x=a.x*c-a.y*s;
    out->y=a.x*s+a.y*c;
}
static inline void vec2m_lerp(Vec2* out,Vec2 a,Vec2 b,float t){
    out->x=a.x+(b.x-a.x)*t;
    out->y=a.y+(b.y-a.y)*t;
}

#endif