package dsl

import (
	"strings"
	"testing"
)

func TestASTNodes_StringAndNode(t *testing.T) {
	verseNode := &VerseRefNode{Reference: "Joh 3:16"}
	verseNode.node()
	if verseNode.String() != "@Joh 3:16" {
		t.Errorf("unexpected verseNode string: %s", verseNode.String())
	}

	searchNode := &SearchNode{Query: "love"}
	searchNode.node()
	if searchNode.String() != "?love" {
		t.Errorf("unexpected searchNode string: %s", searchNode.String())
	}

	scopeNode := &ScopeNode{Count: 3}
	scopeNode.node()
	if scopeNode.String() != "^" {
		t.Errorf("unexpected scopeNode string: %s", scopeNode.String())
	}

	actionNode := &ActionNode{Kind: "themes"}
	actionNode.node()
	if actionNode.String() != "themes()" {
		t.Errorf("unexpected actionNode string: %s", actionNode.String())
	}

	pipeNode := &PipeNode{Left: verseNode, Right: actionNode}
	pipeNode.node()
	if !strings.Contains(pipeNode.String(), "=>") {
		t.Errorf("unexpected pipeNode string: %s", pipeNode.String())
	}

	compNode := &ComparisonNode{
		Target: verseNode,
		Left:   &ActionNode{Kind: "translation", Value: "KR92"},
		Right:  &ActionNode{Kind: "translation", Value: "KJV"},
	}
	compNode.node()
	if !strings.Contains(compNode.String(), "?") || !strings.Contains(compNode.String(), ":") {
		t.Errorf("unexpected compNode string: %s", compNode.String())
	}
}
