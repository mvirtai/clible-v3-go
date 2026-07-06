package ctxkeys

import "context"

type contextKey string

const UserIDKey contextKey = "user_id"

// GetUserID retrieves the user_id from the context if available.
func GetUserID(ctx context.Context) (string, bool) {
	userID, ok := ctx.Value(UserIDKey).(string)
	return userID, ok
}
