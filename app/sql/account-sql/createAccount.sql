INSERT INTO account (username, hash) VALUES ($1, $2) RETURNING username;