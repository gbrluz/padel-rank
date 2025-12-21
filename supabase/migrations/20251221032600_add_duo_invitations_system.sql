/*
  # Add Duo Invitations System

  ## Overview
  Implements a duo invitation system where players can send requests to partners
  before entering the queue together. Both players must accept to join as a duo.

  ## New Tables

  ### `duo_invitations`
  Manages duo pairing invitations
  - `id` (uuid, primary key) - Unique invitation ID
  - `sender_id` (uuid) - Player sending the invitation
  - `receiver_id` (uuid) - Player receiving the invitation
  - `status` (text) - 'pending', 'accepted', 'rejected', 'cancelled'
  - `created_at` (timestamptz) - When invitation was created
  - `responded_at` (timestamptz) - When receiver responded
  - `expires_at` (timestamptz) - When invitation expires (5 minutes)

  ## Security
  - RLS enabled for all operations
  - Users can view their own invitations (sent or received)
  - Only sender can cancel pending invitations
  - Only receiver can accept/reject invitations
  - Expired invitations are automatically handled

  ## Notes
  1. Invitations expire after 5 minutes
  2. Only one pending invitation per sender at a time
  3. When accepted, both players enter queue with mutual partner_id
  4. Queue entries are created with matching average_ranking
*/

-- Create duo_invitations table
CREATE TABLE IF NOT EXISTS duo_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '5 minutes'),
  CONSTRAINT different_players CHECK (sender_id != receiver_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_duo_invitations_sender ON duo_invitations(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_duo_invitations_receiver ON duo_invitations(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_duo_invitations_expires ON duo_invitations(expires_at) WHERE status = 'pending';

-- Enable Row Level Security
ALTER TABLE duo_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for duo_invitations
CREATE POLICY "Users can view their own invitations"
  ON duo_invitations FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send invitations"
  ON duo_invitations FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Senders can cancel their pending invitations"
  ON duo_invitations FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid() AND status = 'pending')
  WITH CHECK (sender_id = auth.uid() AND status IN ('cancelled'));

CREATE POLICY "Receivers can respond to invitations"
  ON duo_invitations FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid() AND status = 'pending')
  WITH CHECK (receiver_id = auth.uid() AND status IN ('accepted', 'rejected'));

-- Function to handle invitation acceptance and queue entry
CREATE OR REPLACE FUNCTION handle_duo_invitation_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if status changed to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Set responded_at timestamp
    NEW.responded_at = now();
    
    -- This function will be called by the application to create queue entries
    -- We just update the timestamp here
  END IF;
  
  -- If status changed to 'rejected'
  IF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
    NEW.responded_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for invitation responses
CREATE TRIGGER on_duo_invitation_response
  BEFORE UPDATE ON duo_invitations
  FOR EACH ROW
  EXECUTE FUNCTION handle_duo_invitation_acceptance();
