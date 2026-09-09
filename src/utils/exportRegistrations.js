import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { requireSupabase } from '../services/supabase'
export async function exportRegistrations(eventId, eventName) {
  const db = requireSupabase()
  const { data, error } = await db
    .from('registrations')
    .select(
      '*, participant:profiles!registrations_participant_id_fkey(full_name,email,phone,roll_number,college_name), answers:registration_answers(answer_text, field:event_registration_fields(label,field_key))'
    )
    .eq('event_id', eventId)
  if (error) throw error
  const rows = (data || []).map((r) =>
    Object.assign(
      {
        Name: r.participant?.full_name,
        Email: r.participant?.email,
        Phone: r.participant?.phone,
        Roll_Number: r.participant?.roll_number,
        College: r.participant?.college_name,
        Approval: r.approval_status,
        Status: r.status,
        Checked_In: r.checked_in,
        Registered_At: r.registered_at,
      },
      ...r.answers.map((a) => ({ [a.field?.label || a.field?.field_key]: a.answer_text }))
    )
  )
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), 'Registrations')
  saveAs(
    new Blob([XLSX.write(book, { bookType: 'xlsx', type: 'array' })], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${eventName.replace(/[^a-z0-9]/gi, '_')}_registrations.xlsx`
  )
}
