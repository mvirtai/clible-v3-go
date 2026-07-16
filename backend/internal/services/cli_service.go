package services

import (
	"strings"
)

// CLICommand represents a parsed slash command.
type CLICommand struct {
	Name  string            // E.g. "/read"
	Args  []string          // Positional arguments, e.g. ["John", "3:16"]
	Flags map[string]string // Keyword flags, e.g. {"translation": "KJV"}
}

// ParseCLICommand parses a raw string input into a structured CLICommand.
// It expects the input to start with a slash '/'.
func ParseCLICommand(input string) *CLICommand {
	input = strings.TrimSpace(input)
	if !strings.HasPrefix(input, "/") {
		return nil
	}

	parts := strings.Fields(input)
	if len(parts) == 0 {
		return nil
	}

	cmdName := parts[0]
	flags := make(map[string]string)
	var args []string

	for _, part := range parts[1:] {
		if strings.HasPrefix(part, "--") {
			// Parse flags like --translation=KJV or boolean flags like --regex
			flagPart := strings.TrimPrefix(part, "--")
			subParts := strings.SplitN(flagPart, "=", 2)

			name := subParts[0]
			value := "true" // Default for boolean flahs (e.g. --regex)
			if len(subParts) > 1 {
				value = subParts[1]
			}
			flags[name] = value

		} else {
			args = append(args, part)
		}
	}

	return &CLICommand{
		Name:  cmdName,
		Args:  args,
		Flags: flags,
	}
}
