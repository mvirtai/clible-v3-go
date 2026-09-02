package services

import (
	"fmt"
	"strings"
)

type EmailContent struct {
	Subject  string
	BodyHTML string
	BodyText string
}

const htmlTemplateFI = `<div style="font-family: sans-serif; max-width: 520px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
  <h2 style="color: #0f172a; margin-bottom: 8px;">Tervetuloa Clibleen! 📖</h2>
  <p style="color: #475569; font-size: 15px;">Vahvista sähköpostiosoitteesi aktivoidaksesi tilisi ja aloittaaksesi tutkimustyötilojen tallentamisen.</p>
  
  <div style="background: #f1f5f9; padding: 16px; border-radius: 12px; text-align: center; margin: 24px 0;">
    <span style="font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Vahvistuskoodisi</span>
    <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 6px; margin-top: 6px;">{{CODE}}</div>
  </div>
  
  <p style="text-align: center;">
    <a href="{{VERIFY_URL}}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Vahvista tili yhdellä klikkauksella</a>
  </p>
  <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; text-align: center;">Koodi on voimassa 15 minuuttia. Jos et luonut tiliä Cliblessä, voit jättää tämän viestin huomiotta.</p>
</div>`

const htmlTemplateEN = `<div style="font-family: sans-serif; max-width: 520px; margin: auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px;">
  <h2 style="color: #0f172a; margin-bottom: 8px;">Welcome to Clible! 📖</h2>
  <p style="color: #475569; font-size: 15px;">Verify your email address to activate your account and start saving your research workspaces.</p>
  
  <div style="background: #f1f5f9; padding: 16px; border-radius: 12px; text-align: center; margin: 24px 0;">
    <span style="font-size: 13px; color: #64748b; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Your verification code</span>
    <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 6px; margin-top: 6px;">{{CODE}}</div>
  </div>
  
  <p style="text-align: center;">
    <a href="{{VERIFY_URL}}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Verify account with one click</a>
  </p>
  <p style="color: #94a3b8; font-size: 12px; margin-top: 32px; text-align: center;">This code expires in 15 minutes. If you did not create a Clible account, you can safely ignore this email.</p>
</div>`

func renderVerificationEmail(lang, code, verifyURL string) EmailContent {

	// Default: en
	if strings.ToLower(lang) == "en" {
		html := strings.ReplaceAll(htmlTemplateEN, "{{CODE}}", code)
		html = strings.ReplaceAll(html, "{{VERIFY_URL}}", verifyURL)

		return EmailContent{
			Subject:  "Verify your Clible account",
			BodyHTML: html,
			BodyText: fmt.Sprintf("Welcome to Clible!\n\nVerification code: %s\nLink: %s", code, verifyURL),
		}
	}

	// fi
	html := strings.ReplaceAll(htmlTemplateFI, "{{CODE}}", code)
	html = strings.ReplaceAll(html, "{{VERIFY_URL}}", verifyURL)

	return EmailContent{
		Subject:  "Tervetuloa Clibleen",
		BodyHTML: html,
		BodyText: fmt.Sprintf("Tervetuloa Clibleen!\n\nVahvistuskoodi: %s\nLinkki: %s", code, verifyURL),
	}
}

