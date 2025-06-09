<?php

namespace App\Notifications;

use App\Models\Report;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewReportNotification extends Notification
{
  use Queueable;

  public Report $report;

  /**
   * Create a new notification instance.
   */
  public function __construct(Report $report)
  {
    $this->report = $report;
  }

  /**
   * Get the notification's delivery channels.
   *
   * @return array<int, string>
   */
  public function via(object $notifiable): array
  {
    return ['database'];
  }

  /**
   * Get the mail representation of the notification.
   */
  public function toMail(object $notifiable): MailMessage
  {
    return (new MailMessage)
      ->line('The introduction to the notification.')
      ->action('Notification Action', url('/'))
      ->line('Thank you for using our application!');
  }

  /**
   * Get the array representation of the notification.
   *
   * @return array<string, mixed>
   */
  public function toArray(object $notifiable): array
  {
    return [
      'title' => "Laporan baru {$this->report->title}",
      'created_by' => "Ditambahkan oleh {$this->report->user->name}",
      'report_id' => $this->report->id,
      'user_id' => $this->report->user_id,
    ];
  }
}
