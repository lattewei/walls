package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var ErrInvalidToken = errors.New("invalid token")

type Claims struct {
	UserID         string `json:"uid"`
	Handle         string `json:"handle"`
	SessionVersion int    `json:"sv"`
	jwt.RegisteredClaims
}

type TokenService struct {
	secret []byte
	ttl    time.Duration
	issuer string
}

func NewTokenService(secret string, ttl time.Duration) *TokenService {
	return &TokenService{
		secret: []byte(secret),
		ttl:    ttl,
		issuer: "walls",
	}
}

func (s *TokenService) IssueAccessToken(userID, handle string, sessionVersion int) (string, time.Time, error) {
	now := time.Now().UTC()
	exp := now.Add(s.ttl)
	if sessionVersion < 1 {
		sessionVersion = 1
	}
	claims := Claims{
		UserID:         userID,
		Handle:         handle,
		SessionVersion: sessionVersion,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.issuer,
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(exp),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(s.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign token: %w", err)
	}
	return signed, exp, nil
}

func (s *TokenService) ParseAccessToken(tokenStr string) (Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return s.secret, nil
	})
	if err != nil {
		return Claims{}, ErrInvalidToken
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return Claims{}, ErrInvalidToken
	}
	if claims.UserID == "" || claims.Issuer != s.issuer || claims.SessionVersion < 1 {
		return Claims{}, ErrInvalidToken
	}
	return *claims, nil
}
