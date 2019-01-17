from const import TIME_REACT, A_THRESH, P, EPSILON, B_SAFE, LARGE_NUMBER, MIN_GAP_V0, DT, SAFE_TIME_HEADWAY, ACC_EXP, S1, ALMOST_ZERO
from math import sqrt
import random


def car_following(vel, vel_max, acc_max, dec_max, vel_front=LARGE_NUMBER, gap_front=LARGE_NUMBER, t=DT,
                  safe_gap=MIN_GAP_V0, safe_time_headway=SAFE_TIME_HEADWAY):
    # implementation = [krauss_by_elemar, krauss_by_kesting, krauss_by_sumo][1]
    # return implementation(vel, vel_max, acc_max, dec_max, vel_front, gap_front, t, safe_gap)

    gap_front = ALMOST_ZERO if gap_front == 0 else gap_front
    return intelligent_driver_model(vel, vel_max, acc_max, dec_max, vel_front, gap_front, safe_gap,
                                    safe_time_headway=safe_time_headway)


def krauss_by_elemar(vel, vel_max, acc_max, dec_max, vel_front=LARGE_NUMBER, gap_front=LARGE_NUMBER, t=DT,
                     safe_gap=MIN_GAP_V0):
    if vel_front != LARGE_NUMBER:
        if vel_front < (2 * safe_gap / TIME_REACT):
            vel_des = ((vel_front * TIME_REACT) ** 2) / (4 * safe_gap) + safe_gap
        else:
            vel_des = vel_front * TIME_REACT
        tb = (vel + vel_front) / dec_max
        t_des = TIME_REACT + tb
        vel_safe = vel_front + ((gap_front - vel_des) / t_des)
    else:
        vel_safe = vel_max

    r = random.random()

    vel_des = min(vel_safe, vel_max, vel + acc_max * t)
    vel_final = max(vel_des - EPSILON * acc_max * r * t, 0.0)
    acc = (vel_final - vel) / t

    return round(acc, 2)


def krauss_by_kesting(vel, vel_max, acc_max, dec_max, vel_front=LARGE_NUMBER, gap_front=LARGE_NUMBER, t=DT,
                      safe_gap=MIN_GAP_V0):
    vel_safe = -dec_max * t + sqrt((dec_max * t) ** 2 + vel_front ** 2 + 2 * dec_max * max(gap_front - safe_gap, 0.0))
    vel_upper = min(vel_safe, vel_max, vel + acc_max * t)
    vel_lower = (1 - EPSILON) * vel_upper + EPSILON * max(0.0, vel - dec_max * t)

    r = random.random()

    vel_final = max(0.0, vel_lower + r * (vel_upper - vel_lower))
    vel_final = min(vel_final, vel_max)
    acc = (vel_final - vel) / t

    return round(acc, 2)


def krauss_by_sumo(vel, vel_max, acc_max, dec_max, vel_front=LARGE_NUMBER, gap_front=LARGE_NUMBER, t=DT,
                   safe_gap=MIN_GAP_V0):
    vel_safe = -dec_max * t + sqrt((dec_max * t) ** 2 + vel_front ** 2 + 2 * dec_max * max(gap_front - safe_gap, 0.0))
    vel_des = min(vel_safe, vel + acc_max * t, vel_max)

    r = random.random()

    vel_final = max(0.0, vel_des - r * acc_max * t * EPSILON)

    return round((vel_final - vel) / t, 2)


def mobil_safety(acc_new_lag, b_safe=B_SAFE):
    return acc_new_lag >= -b_safe


def mobil_incentive(acc_new, acc_curr, acc_new_back, acc_curr_back, acc_new_lag, acc_curr_lag,
                    a_thresh=A_THRESH, p=P):
    incentive = (acc_new - acc_curr) + \
                (p * (acc_new_back - acc_curr_back + acc_new_lag - acc_curr_lag))

    return round(incentive - a_thresh, 2)


def intelligent_driver_model(vel, vel_max, acc_max, dec_max, vel_front=LARGE_NUMBER, gap_front=LARGE_NUMBER,
                             s0=MIN_GAP_V0, acc_exp=ACC_EXP, s1=S1, safe_time_headway=SAFE_TIME_HEADWAY):

    if gap_front == LARGE_NUMBER:
        acc = acc_max * (1 - ((vel / vel_max) ** acc_exp))
        return round(acc, 2)

    min_gap_des = s0 + \
                  (s1 * (sqrt(vel / vel_max))) + \
                  (safe_time_headway * vel) + \
                  ((vel * (vel - vel_front)) / (2 * sqrt(acc_max * dec_max)))

    acc = acc_max * (1 - ((vel / vel_max) ** acc_exp) - (min_gap_des / gap_front) ** 2)

    return round(acc, 2)
