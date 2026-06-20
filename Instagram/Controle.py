import pygame
import vgamepad as vg
import time

def start_mapping():
    """
    Nota técnica: Atualmente o driver ViGEmBus não suporta emulação nativa de DualSense (PS5).
    A melhor alternativa para ter suporte a PlayStation no PC é emular um DualShock 4 (PS4),
    que habilitará os mesmos ícones e funcionalidades na maioria dos jogos.
    """
    
    # Dicionário para evitar repetição de logs
    last_state = {}

    # 1. Inicializa o Pygame para ler o controle físico
    pygame.init()
    pygame.joystick.init()

    if pygame.joystick.get_count() == 0:
        print("Nenhum controle físico detectado!")
        return

    print("Inicializando controle físico...")
    # Pega o primeiro controle conectado (PS3 ou PS4)
    ps_physical = pygame.joystick.Joystick(0)
    ps_physical.init()
    print(f"Mapeando controle: {ps_physical.get_name()}")
    print(f"Eixos detectados: {ps_physical.get_numaxes()}")
    print(f"Botões detectados: {ps_physical.get_numbuttons()}")

    # 2. Inicializa o controle virtual (Emulando um DualShock 4)
    print("\nTentando criar controle virtual (Target: PlayStation 4)...")
    try:
        target_pad = vg.VDS4Gamepad()
        print("Controle virtual criado com sucesso!")
    except Exception as e:
        print(f"ERRO CRÍTICO ao criar controle virtual: {e}")
        print("Certifique-se de que o driver ViGEmBus está instalado.")
        return

    print("Conversão ativa! O jogo verá um controle de PlayStation virtual.")
    print("Pressione Ctrl+C para encerrar.")

    try:
        while True:
            pygame.event.pump()

            # --- MAPEAMENTO DE EIXOS (Analógicos) ---
            # Eixo 0: Esquerdo X, Eixo 1: Esquerdo Y
            # Eixo 2: Direito X, Eixo 3: Direito Y
            target_pad.left_joystick_float(x_value_float=ps_physical.get_axis(0), 
                                           y_value_float=ps_physical.get_axis(1))
            target_pad.right_joystick_float(x_value_float=ps_physical.get_axis(2), 
                                            y_value_float=ps_physical.get_axis(3))

            # --- MAPEAMENTO DE GATILHOS (L2 e R2) ---
            num_axes = ps_physical.get_numaxes()
            l2_axis = (ps_physical.get_axis(4) + 1) / 2 if num_axes > 4 else 0.0
            r2_axis = (ps_physical.get_axis(5) + 1) / 2 if num_axes > 5 else 0.0
            
            target_pad.left_trigger_float(value_float=l2_axis)
            target_pad.right_trigger_float(value_float=r2_axis)

            # --- MAPEAMENTO COMPLETO DE BOTÕES ---
            # Mapeamento padrão Pygame para a maioria dos controles de PlayStation
            button_map = {
                0: vg.DS4_BUTTONS.DS4_BUTTON_SQUARE,
                1: vg.DS4_BUTTONS.DS4_BUTTON_CROSS,
                2: vg.DS4_BUTTONS.DS4_BUTTON_CIRCLE,
                3: vg.DS4_BUTTONS.DS4_BUTTON_TRIANGLE,
                4: vg.DS4_BUTTONS.DS4_BUTTON_SHOULDER_LEFT,  # L1
                5: vg.DS4_BUTTONS.DS4_BUTTON_SHOULDER_RIGHT, # R1
                8: vg.DS4_BUTTONS.DS4_BUTTON_SHARE,
                9: vg.DS4_BUTTONS.DS4_BUTTON_OPTIONS,
                10: vg.DS4_BUTTONS.DS4_BUTTON_PS,
                11: vg.DS4_BUTTONS.DS4_BUTTON_THUMB_LEFT,    # L3
                12: vg.DS4_BUTTONS.DS4_BUTTON_THUMB_RIGHT,   # R3
            }

            for physical_idx, virtual_btn in button_map.items():
                if physical_idx < ps_physical.get_numbuttons():
                    if ps_physical.get_button(physical_idx):
                        target_pad.press_button(button=virtual_btn)
                    else:
                        target_pad.release_button(button=virtual_btn)

            # --- MAPEAMENTO DE D-PAD (Setas) ---
            if ps_physical.get_numhats() > 0:
                hat = ps_physical.get_hat(0) # (x, y)
                if hat == (0, 1):    target_pad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_NORTH)
                elif hat == (0, -1): target_pad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_SOUTH)
                elif hat == (1, 0):  target_pad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_EAST)
                elif hat == (-1, 0): target_pad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_WEST)
                elif hat == (1, 1):  target_pad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_NORTHEAST)
                elif hat == (-1, 1): target_pad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_NORTHWEST)
                elif hat == (1, -1): target_pad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_SOUTHEAST)
                elif hat == (-1, -1):target_pad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_SOUTHWEST)
                else:                target_pad.directional_pad(direction=vg.DS4_DPAD_DIRECTIONS.DS4_BUTTON_DPAD_NONE)
            
            # Envia as atualizações para o sistema
            target_pad.update()
            time.sleep(0.005) # Menor latência (5ms)

    except KeyboardInterrupt:
        print("\nMapeamento encerrado.")
    except Exception as e:
        print(f"\nErro durante a execução: {e}")
    finally:
        # Limpeza obrigatória para evitar problemas no driver
        try:
            del target_pad
            print("Dispositivo virtual desconectado com segurança.")
        except:
            pass
        pygame.quit()

if __name__ == "__main__":
    start_mapping()
