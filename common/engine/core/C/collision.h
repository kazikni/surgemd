#ifndef SMDE_COLLISION_H
#define SMDE_COLLISION_H

#include <stdbool.h>

__attribute__((export_name("circle_cw_circle")))
bool circle_cw_circle(float ax,float ay,float ar,float bx,float by,float br){
    float dx = ax - bx;
    float dy = ay - by;
    float r = ar + br;
    return dx * dx + dy * dy < r * r;
}

#endif